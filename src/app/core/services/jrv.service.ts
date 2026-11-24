import { Injectable, inject } from '@angular/core';
import { JrvConDetalles } from '../models/jrv.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class JrvService {
  private readonly supabase = inject(SupabaseService);

  async listarMesasRecinto(recintoId: string): Promise<JrvConDetalles[]> {
    const [jrvsRes, veedoresRes, actasRes] = await Promise.all([
      this.supabase.client
        .from('jrv')
        .select('id, recinto_id, numero, veedor_id, estado, created_at')
        .eq('recinto_id', recintoId)
        .order('numero', { ascending: true }),
      this.supabase.client
        .from('usuarios')
        .select('id, nombres, apellidos, cedula')
        .eq('rol', 'veedor')
        .eq('recinto_id', recintoId),
      this.supabase.client.from('actas').select('jrv_id, dignidad'),
    ]);

    if (jrvsRes.error) {
      throw new Error(this.supabase.interpretarError(jrvsRes.error, 'Error al cargar las JRV'));
    }

    const veedoresMap = new Map(
      (veedoresRes.data ?? []).map((v) => [
        v.id,
        { nombre: `${v.nombres} ${v.apellidos}`, cedula: v.cedula },
      ])
    );

    const actas = actasRes.data ?? [];

    return (jrvsRes.data ?? []).map((jrv) => {
      const veedor = jrv.veedor_id ? veedoresMap.get(jrv.veedor_id) : null;
      const actasJrv = actas.filter((a) => a.jrv_id === jrv.id);
      return {
        ...jrv,
        veedor_nombre: veedor?.nombre ?? null,
        veedor_cedula: veedor?.cedula ?? null,
        tiene_acta_alcalde: actasJrv.some((a) => a.dignidad === 'alcalde'),
        tiene_acta_prefecto: actasJrv.some((a) => a.dignidad === 'prefecto'),
      };
    });
  }

  async listarMisMesasAsignadas(): Promise<JrvConDetalles[]> {
    const [jrvsRes, recintosRes, actasRes] = await Promise.all([
      this.supabase.client
        .from('jrv')
        .select('id, recinto_id, numero, veedor_id, estado, created_at')
        .order('numero', { ascending: true }),
      this.supabase.client.from('recintos').select('id, nombre, parroquia'),
      this.supabase.client.from('actas').select('jrv_id, dignidad'),
    ]);

    if (jrvsRes.error) {
      throw new Error(
        this.supabase.interpretarError(jrvsRes.error, 'Error al cargar sus mesas asignadas')
      );
    }

    const recintosMap = new Map((recintosRes.data ?? []).map((r) => [r.id, r]));
    const actas = actasRes.data ?? [];

    return (jrvsRes.data ?? []).map((jrv) => {
      const recinto = recintosMap.get(jrv.recinto_id);
      const actasJrv = actas.filter((a) => a.jrv_id === jrv.id);
      return {
        ...jrv,
        recinto_nombre: recinto?.nombre ?? 'Recinto',
        recinto_parroquia: recinto?.parroquia ?? '',
        tiene_acta_alcalde: actasJrv.some((a) => a.dignidad === 'alcalde'),
        tiene_acta_prefecto: actasJrv.some((a) => a.dignidad === 'prefecto'),
      };
    });
  }

  async asignarVeedor(jrvId: string, veedorId: string | null): Promise<void> {
    const { error } = await this.supabase.client
      .from('jrv')
      .update({ veedor_id: veedorId })
      .eq('id', jrvId);

    if (error) {
      throw new Error(
        this.supabase.interpretarError(error, 'No se pudo asignar el veedor a la JRV')
      );
    }
  }
}
