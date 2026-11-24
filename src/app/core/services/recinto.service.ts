import { Injectable, inject } from '@angular/core';
import { CrearRecintoPayload, Recinto, RecintoConResumen } from '../models/recinto.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class RecintoService {
  private readonly supabase = inject(SupabaseService);

  async listarRecintos(): Promise<Recinto[]> {
    const { data, error } = await this.supabase.client
      .from('recintos')
      .select('*')
      .order('parroquia', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(this.supabase.interpretarError(error, 'No se pudieron cargar los recintos'));
    }

    return (data ?? []) as Recinto[];
  }

  async listarRecintosConResumen(): Promise<RecintoConResumen[]> {
    const [recintosRes, coordsRes, jrvsRes, actasRes] = await Promise.all([
      this.supabase.client
        .from('recintos')
        .select('*')
        .order('parroquia', { ascending: true })
        .order('nombre', { ascending: true }),
      this.supabase.client
        .from('usuarios')
        .select('id, nombres, apellidos, recinto_id')
        .eq('rol', 'recinto'),
      this.supabase.client.from('jrv').select('id, recinto_id, estado'),
      this.supabase.client.from('actas').select('id, jrv_id'),
    ]);

    if (recintosRes.error) {
      throw new Error(this.supabase.interpretarError(recintosRes.error, 'Error al cargar recintos'));
    }

    const recintos = (recintosRes.data ?? []) as Recinto[];
    const coordinadores = coordsRes.data ?? [];
    const jrvs = jrvsRes.data ?? [];
    const actas = actasRes.data ?? [];

    const jrvRecintoMap = new Map<string, string>();
    for (const j of jrvs) {
      jrvRecintoMap.set(j.id, j.recinto_id);
    }

    const actasPorRecinto = new Map<string, number>();
    for (const a of actas) {
      const rId = jrvRecintoMap.get(a.jrv_id);
      if (rId) {
        actasPorRecinto.set(rId, (actasPorRecinto.get(rId) ?? 0) + 1);
      }
    }

    return recintos.map((recinto) => {
      const coord = coordinadores.find((c) => c.recinto_id === recinto.id);
      const jrvsRecinto = jrvs.filter((j) => j.recinto_id === recinto.id);
      const completas = jrvsRecinto.filter((j) => j.estado === 'completa').length;
      const parciales = jrvsRecinto.filter((j) => j.estado === 'parcial').length;
      const pendientes = jrvsRecinto.filter((j) => j.estado === 'pendiente').length;
      const totalJrv = jrvsRecinto.length || recinto.cantidad_jrv;

      return {
        ...recinto,
        coordinador_id: coord?.id ?? null,
        coordinador_nombre: coord ? `${coord.nombres} ${coord.apellidos}` : null,
        jrv_completas: completas,
        jrv_parciales: parciales,
        jrv_pendientes: pendientes,
        actas_registradas: actasPorRecinto.get(recinto.id) ?? 0,
        actas_esperadas: totalJrv * 2,
      };
    });
  }

  async obtenerRecintoPorId(recintoId: string): Promise<Recinto | null> {
    const { data, error } = await this.supabase.client
      .from('recintos')
      .select('*')
      .eq('id', recintoId)
      .maybeSingle();

    if (error) {
      throw new Error(this.supabase.interpretarError(error, 'No se pudo cargar el recinto'));
    }

    return (data as Recinto) ?? null;
  }

  async crearRecinto(payload: CrearRecintoPayload): Promise<Recinto> {
    const { data, error } = await this.supabase.client
      .from('recintos')
      .insert({
        provincia: payload.provincia.trim(),
        canton: payload.canton.trim(),
        parroquia: payload.parroquia.trim(),
        nombre: payload.nombre.trim(),
        cantidad_jrv: Number(payload.cantidad_jrv),
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(this.supabase.interpretarError(error, 'No se pudo crear el recinto'));
    }

    return data as Recinto;
  }
}
