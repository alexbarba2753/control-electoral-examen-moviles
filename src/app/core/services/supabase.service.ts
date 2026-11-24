import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  interpretarError(error: unknown, mensajePorDefecto = 'Ocurrio un error inesperado'): string {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'Sin conexion a internet. Verifique su red e intente nuevamente.';
    }

    if (error && typeof error === 'object') {
      const errObj = error as { message?: string; context?: { status?: number }; error?: string };
      const msg = errObj.message || errObj.error || '';
      if (/failed to fetch|networkerror|load failed|fetch/i.test(msg)) {
        return 'No se pudo conectar con el servidor. Revise su conexion a internet.';
      }
      if (msg) {
        return msg;
      }
    }

    if (typeof error === 'string' && error.trim()) {
      return error;
    }

    return mensajePorDefecto;
  }
}
