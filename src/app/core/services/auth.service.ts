import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RolUsuario, Usuario } from '../models/usuario.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  private readonly _usuario = signal<Usuario | null>(null);
  private readonly _inicializado = signal<boolean>(false);
  private readonly _recuperandoPassword = signal<boolean>(false);
  private promesaInicializacion: Promise<void> | null = null;

  readonly usuario = this._usuario.asReadonly();
  readonly inicializado = this._inicializado.asReadonly();
  readonly recuperandoPassword = this._recuperandoPassword.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);
  readonly rol = computed<RolUsuario | null>(() => this._usuario()?.rol ?? null);

  constructor() {
    this.supabase.client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        this._recuperandoPassword.set(true);
        void this.cargarPerfilActual().then(() => {
          void this.router.navigateByUrl('/auth/cambiar-password', { replaceUrl: true });
        });
      } else if (event === 'SIGNED_OUT') {
        this._usuario.set(null);
        this._recuperandoPassword.set(false);
      }
    });
  }

  async asegurarInicializacion(): Promise<void> {
    if (this._inicializado()) {
      return;
    }
    if (!this.promesaInicializacion) {
      this.promesaInicializacion = this.cargarPerfilActual().finally(() => {
        this._inicializado.set(true);
      });
    }
    return this.promesaInicializacion;
  }

  async cargarPerfilActual(): Promise<Usuario | null> {
    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      this._usuario.set(null);
      return null;
    }

    const { data, error } = await this.supabase.client
      .from('usuarios')
      .select('id, cedula, nombres, apellidos, telefono, correo, rol, recinto_id, debe_cambiar_password, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      this._usuario.set(null);
      return null;
    }

    const perfil = data as Usuario;
    this._usuario.set(perfil);
    return perfil;
  }

  async iniciarSesionConCedula(cedula: string, password: string): Promise<Usuario> {
    const { data, error } = await this.supabase.client.functions.invoke('login-cedula', {
      body: {
        action: 'login',
        cedula: cedula.trim(),
        password,
      },
    });

    if (error) {
      const detalle = await this.extraerMensajeFuncion(error, 'Cedula o contrasena incorrectas');
      throw new Error(detalle);
    }

    if (!data?.session || !data?.usuario) {
      throw new Error(data?.error || 'Credenciales invalidas');
    }

    const { error: sessionErr } = await this.supabase.client.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (sessionErr) {
      throw new Error(this.supabase.interpretarError(sessionErr, 'No se pudo iniciar la sesion'));
    }

    const perfil = data.usuario as Usuario;
    this._usuario.set(perfil);
    this._inicializado.set(true);
    return perfil;
  }

  async cambiarPassword(nuevaPassword: string): Promise<void> {
    const { error: authErr } = await this.supabase.client.auth.updateUser({
      password: nuevaPassword,
    });

    if (authErr) {
      throw new Error(this.supabase.interpretarError(authErr, 'No se pudo actualizar la contrasena'));
    }

    const actual = this._usuario() ?? (await this.cargarPerfilActual());
    if (actual) {
      const { error: dbErr } = await this.supabase.client
        .from('usuarios')
        .update({ debe_cambiar_password: false })
        .eq('id', actual.id);

      if (dbErr) {
        throw new Error(this.supabase.interpretarError(dbErr, 'No se pudo confirmar el cambio de clave'));
      }

      this._usuario.set({ ...actual, debe_cambiar_password: false });
    }
    this._recuperandoPassword.set(false);
  }

  async solicitarRecuperacion(identificador: string): Promise<string> {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/cambiar-password` : undefined;

    const { data, error } = await this.supabase.client.functions.invoke('login-cedula', {
      body: {
        action: 'recuperar',
        identificador: identificador.trim(),
        redirectTo,
      },
    });

    if (error) {
      const detalle = await this.extraerMensajeFuncion(
        error,
        'No se pudo procesar la recuperacion de contrasena'
      );
      throw new Error(detalle);
    }

    return data?.mensaje || 'Se envio un enlace de recuperacion al correo registrado.';
  }

  async cerrarSesion(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this._usuario.set(null);
    this._recuperandoPassword.set(false);
    await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }

  rutaInicioPorRol(rol: RolUsuario): string {
    switch (rol) {
      case 'provincial':
        return '/provincial';
      case 'recinto':
        return '/recinto';
      case 'veedor':
        return '/veedor';
    }
  }

  private async extraerMensajeFuncion(error: unknown, fallback: string): Promise<string> {
    if (error && typeof error === 'object' && 'context' in error) {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const parsed = await ctx.json();
          if (parsed?.error) {
            return String(parsed.error);
          }
        } catch {
          // respuesta no json
        }
      }
    }
    return this.supabase.interpretarError(error, fallback);
  }
}
