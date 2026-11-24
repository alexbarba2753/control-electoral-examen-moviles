import { Injectable, inject } from '@angular/core';
import {
  CrearUsuarioPayload,
  CrearUsuarioRespuesta,
  Usuario,
} from '../models/usuario.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly supabase = inject(SupabaseService);

  async listarCoordinadoresRecinto(): Promise<Usuario[]> {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .select('*')
      .eq('rol', 'recinto')
      .order('apellidos', { ascending: true });

    if (error) {
      throw new Error(
        this.supabase.interpretarError(error, 'No se pudieron cargar los coordinadores de recinto')
      );
    }

    return (data ?? []) as Usuario[];
  }

  async listarVeedoresRecinto(recintoId: string): Promise<Usuario[]> {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .select('*')
      .eq('rol', 'veedor')
      .eq('recinto_id', recintoId)
      .order('apellidos', { ascending: true });

    if (error) {
      throw new Error(
        this.supabase.interpretarError(error, 'No se pudieron cargar los veedores del recinto')
      );
    }

    return (data ?? []) as Usuario[];
  }

  async crearUsuario(payload: CrearUsuarioPayload): Promise<CrearUsuarioRespuesta> {
    const { data: sessionData } = await this.supabase.client.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error('La sesion expiro. Vuelva a iniciar sesion.');
    }

    const { data, error } = await this.supabase.client.functions.invoke('crear-usuario', {
      body: payload,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      let mensaje = 'No se pudo crear la cuenta';
      if ('context' in error && error.context && typeof error.context.json === 'function') {
        try {
          const parsed = await error.context.json();
          if (parsed?.error) {
            mensaje = String(parsed.error);
          }
        } catch {
          mensaje = this.supabase.interpretarError(error, mensaje);
        }
      } else {
        mensaje = this.supabase.interpretarError(error, mensaje);
      }
      throw new Error(mensaje);
    }

    return data as CrearUsuarioRespuesta;
  }

  async asignarRecintoACoordinador(
    coordinadorId: string,
    recintoId: string | null
  ): Promise<void> {
    if (recintoId) {
      const { error: limpiarErr } = await this.supabase.client
        .from('usuarios')
        .update({ recinto_id: null })
        .eq('rol', 'recinto')
        .eq('recinto_id', recintoId)
        .neq('id', coordinadorId);

      if (limpiarErr) {
        throw new Error(
          this.supabase.interpretarError(
            limpiarErr,
            'No se pudo liberar la asignacion anterior del recinto'
          )
        );
      }
    }

    const { error } = await this.supabase.client
      .from('usuarios')
      .update({ recinto_id: recintoId })
      .eq('id', coordinadorId);

    if (error) {
      throw new Error(
        this.supabase.interpretarError(error, 'No se pudo asignar el coordinador al recinto')
      );
    }
  }
}
