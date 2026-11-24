import { Injectable, inject } from '@angular/core';
import {
  ResultadoCandidato,
  ResumenAvanceGlobal,
  ResumenAvanceRecinto,
} from '../models/dashboard.model';
import { Dignidad } from '../models/organizacion.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly supabase = inject(SupabaseService);

  async obtenerResumen(recintoIdFiltro?: string | null): Promise<ResumenAvanceGlobal> {
    const [recintosRes, jrvsRes, actasRes, votosRes, orgsRes, candsRes] = await Promise.all([
      this.supabase.client.from('recintos').select('*').order('nombre', { ascending: true }),
      this.supabase.client.from('jrv').select('id, recinto_id, estado'),
      this.supabase.client
        .from('actas')
        .select('id, jrv_id, dignidad, nulos, blancos, total_sufragantes'),
      this.supabase.client.from('acta_votos').select('acta_id, organizacion_id, votos'),
      this.supabase.client.from('organizaciones').select('*').order('orden', { ascending: true }),
      this.supabase.client.from('candidaturas').select('*'),
    ]);

    const primerError =
      recintosRes.error ||
      jrvsRes.error ||
      actasRes.error ||
      votosRes.error ||
      orgsRes.error ||
      candsRes.error;

    if (primerError) {
      throw new Error(
        this.supabase.interpretarError(primerError, 'No se pudo generar el dashboard de resultados')
      );
    }

    const todosRecintos = recintosRes.data ?? [];
    const todosJrvs = jrvsRes.data ?? [];
    const todasActas = actasRes.data ?? [];
    const todosVotos = votosRes.data ?? [];
    const orgs = orgsRes.data ?? [];
    const cands = candsRes.data ?? [];

    const jrvRecintoMap = new Map<string, string>(todosJrvs.map((j) => [j.id, j.recinto_id]));

    const recintosFiltrados = recintoIdFiltro
      ? todosRecintos.filter((r) => r.id === recintoIdFiltro)
      : todosRecintos;

    const jrvsFiltrados = recintoIdFiltro
      ? todosJrvs.filter((j) => j.recinto_id === recintoIdFiltro)
      : todosJrvs;

    const actasFiltradas = recintoIdFiltro
      ? todasActas.filter((a) => jrvRecintoMap.get(a.jrv_id) === recintoIdFiltro)
      : todasActas;

    const actasAlcaldeIds = new Set(
      actasFiltradas.filter((a) => a.dignidad === 'alcalde').map((a) => a.id)
    );
    const actasPrefectoIds = new Set(
      actasFiltradas.filter((a) => a.dignidad === 'prefecto').map((a) => a.id)
    );

    const calcularResultados = (
      dignidad: Dignidad,
      actasIds: Set<string>
    ): ResultadoCandidato[] => {
      const acumulados = new Map<string, number>();
      let totalValidos = 0;

      for (const voto of todosVotos) {
        if (!actasIds.has(voto.acta_id)) continue;
        const val = Number(voto.votos);
        acumulados.set(voto.organizacion_id, (acumulados.get(voto.organizacion_id) ?? 0) + val);
        totalValidos += val;
      }

      return orgs
        .map((org) => {
          const cand = cands.find(
            (c) => c.organizacion_id === org.id && c.dignidad === dignidad
          );
          const votos = acumulados.get(org.id) ?? 0;
          const porcentaje = totalValidos > 0 ? Math.round((votos / totalValidos) * 1000) / 10 : 0;
          return {
            organizacion_id: org.id,
            sigla: org.sigla,
            lista: org.lista,
            organizacion_nombre: org.nombre,
            nombre_candidato: cand?.nombre_candidato ?? org.nombre,
            color_hex: org.color_hex,
            dignidad,
            votos,
            porcentaje,
          };
        })
        .sort((a, b) => b.votos - a.votos);
    };

    const actasAlcalde = actasFiltradas.filter((a) => a.dignidad === 'alcalde');
    const actasPrefecto = actasFiltradas.filter((a) => a.dignidad === 'prefecto');

    const avancePorRecinto: ResumenAvanceRecinto[] = recintosFiltrados.map((r) => {
      const jrvsR = todosJrvs.filter((j) => j.recinto_id === r.id);
      const esperadas = (jrvsR.length || r.cantidad_jrv) * 2;
      const registradas = todasActas.filter((a) => jrvRecintoMap.get(a.jrv_id) === r.id).length;
      const pct = esperadas > 0 ? Math.round((registradas / esperadas) * 1000) / 10 : 0;
      return {
        recinto_id: r.id,
        recinto_nombre: r.nombre,
        parroquia: r.parroquia,
        canton: r.canton,
        total_jrv: jrvsR.length || r.cantidad_jrv,
        actas_esperadas: esperadas,
        actas_registradas: registradas,
        porcentaje_avance: pct,
      };
    });

    const actasEsperadas = jrvsFiltrados.length * 2;
    const actasRegistradas = actasFiltradas.length;
    const porcentajeAvance =
      actasEsperadas > 0 ? Math.round((actasRegistradas / actasEsperadas) * 1000) / 10 : 0;

    return {
      total_recintos: recintosFiltrados.length,
      total_jrv: jrvsFiltrados.length,
      actas_esperadas: actasEsperadas,
      actas_registradas: actasRegistradas,
      porcentaje_avance: porcentajeAvance,
      total_nulos_alcalde: actasAlcalde.reduce((s, a) => s + Number(a.nulos), 0),
      total_blancos_alcalde: actasAlcalde.reduce((s, a) => s + Number(a.blancos), 0),
      total_sufragantes_alcalde: actasAlcalde.reduce((s, a) => s + Number(a.total_sufragantes), 0),
      total_nulos_prefecto: actasPrefecto.reduce((s, a) => s + Number(a.nulos), 0),
      total_blancos_prefecto: actasPrefecto.reduce((s, a) => s + Number(a.blancos), 0),
      total_sufragantes_prefecto: actasPrefecto.reduce(
        (s, a) => s + Number(a.total_sufragantes),
        0
      ),
      resultados_alcalde: calcularResultados('alcalde', actasAlcaldeIds),
      resultados_prefecto: calcularResultados('prefecto', actasPrefectoIds),
      avance_por_recinto: avancePorRecinto,
    };
  }
}
