import { Injectable, inject } from '@angular/core';
import { ActaConDetalle, ActaVoto, GuardarActaPayload } from '../models/acta.model';
import { Dignidad, OrganizacionConCandidatura } from '../models/organizacion.model';
import { AuthService } from './auth.service';
import { ImageQualityService } from './image-quality.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ActaService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly imageQuality = inject(ImageQualityService);

  async listarOrganizacionesPorDignidad(dignidad: Dignidad): Promise<OrganizacionConCandidatura[]> {
    const [orgsRes, candsRes] = await Promise.all([
      this.supabase.client.from('organizaciones').select('*').order('orden', { ascending: true }),
      this.supabase.client.from('candidaturas').select('*').eq('dignidad', dignidad),
    ]);

    if (orgsRes.error || candsRes.error) {
      throw new Error(
        this.supabase.interpretarError(
          orgsRes.error || candsRes.error,
          'No se pudieron cargar las organizaciones y candidaturas'
        )
      );
    }

    const candMap = new Map(
      (candsRes.data ?? []).map((c) => [c.organizacion_id, c.nombre_candidato])
    );

    return (orgsRes.data ?? []).map((org) => ({
      ...org,
      dignidad,
      nombre_candidato: candMap.get(org.id) ?? 'Candidatura registrada',
    }));
  }

  async obtenerActa(jrvId: string, dignidad: Dignidad): Promise<ActaConDetalle | null> {
    const { data: acta, error } = await this.supabase.client
      .from('actas')
      .select('*')
      .eq('jrv_id', jrvId)
      .eq('dignidad', dignidad)
      .maybeSingle();

    if (error) {
      throw new Error(this.supabase.interpretarError(error, 'Error al consultar el acta'));
    }
    if (!acta) {
      return null;
    }

    const { data: votos, error: votosErr } = await this.supabase.client
      .from('acta_votos')
      .select('id, acta_id, organizacion_id, votos')
      .eq('acta_id', acta.id);

    if (votosErr) {
      throw new Error(this.supabase.interpretarError(votosErr, 'Error al cargar los votos'));
    }

    const fotoUrl = await this.obtenerUrlFirmada(acta.foto_path);

    return {
      ...acta,
      votos: (votos ?? []) as ActaVoto[],
      foto_url: fotoUrl,
    };
  }

  async listarActasConUbicacion(recintoId?: string): Promise<ActaConDetalle[]> {
    const [actasRes, jrvsRes, recintosRes, votosRes] = await Promise.all([
      this.supabase.client
        .from('actas')
        .select('*')
        .order('updated_at', { ascending: false }),
      this.supabase.client.from('jrv').select('id, numero, recinto_id'),
      this.supabase.client.from('recintos').select('id, nombre, parroquia'),
      this.supabase.client.from('acta_votos').select('acta_id, organizacion_id, votos'),
    ]);

    if (actasRes.error) {
      throw new Error(this.supabase.interpretarError(actasRes.error, 'Error al cargar actas'));
    }

    const jrvMap = new Map((jrvsRes.data ?? []).map((j) => [j.id, j]));
    const recintoMap = new Map((recintosRes.data ?? []).map((r) => [r.id, r]));
    const votosPorActa = new Map<string, ActaVoto[]>();
    for (const v of votosRes.data ?? []) {
      const lista = votosPorActa.get(v.acta_id) ?? [];
      lista.push(v as ActaVoto);
      votosPorActa.set(v.acta_id, lista);
    }

    const filtradas = (actasRes.data ?? []).filter((acta) => {
      if (!recintoId) return true;
      const jrv = jrvMap.get(acta.jrv_id);
      return jrv?.recinto_id === recintoId;
    });

    const resultados: ActaConDetalle[] = [];
    for (const acta of filtradas) {
      const jrv = jrvMap.get(acta.jrv_id);
      const recinto = jrv ? recintoMap.get(jrv.recinto_id) : null;
      const fotoUrl = await this.obtenerUrlFirmada(acta.foto_path);
      resultados.push({
        ...acta,
        votos: votosPorActa.get(acta.id) ?? [],
        foto_url: fotoUrl,
        jrv_numero: jrv?.numero,
        recinto_id: jrv?.recinto_id,
        recinto_nombre: recinto?.nombre ?? 'Recinto',
        recinto_parroquia: recinto?.parroquia ?? '',
      });
    }

    return resultados;
  }

  async guardarActa(payload: GuardarActaPayload): Promise<ActaConDetalle> {
    const usuario = this.auth.usuario();
    if (!usuario) {
      throw new Error('Debe iniciar sesion para guardar actas.');
    }

    let fotoPath = payload.foto_path_existente ?? '';

    if (payload.foto_data_url) {
      const blob = this.imageQuality.dataUrlABlob(payload.foto_data_url);
      const ruta = `${payload.recinto_id}/${payload.jrv_id}/${payload.dignidad}.jpg`;
      const { error: uploadErr } = await this.supabase.client.storage
        .from('actas-fotos')
        .upload(ruta, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(
          this.supabase.interpretarError(uploadErr, 'No se pudo subir la fotografia del acta')
        );
      }
      fotoPath = ruta;
    }

    if (!fotoPath) {
      throw new Error('Debe capturar una fotografia nitida del acta antes de guardar.');
    }

    const existente = await this.obtenerActa(payload.jrv_id, payload.dignidad);
    let actaGuardadaId: string;

    if (existente) {
      const { data: updated, error: updateErr } = await this.supabase.client
        .from('actas')
        .update({
          nulos: Number(payload.nulos),
          blancos: Number(payload.blancos),
          total_sufragantes: Number(payload.total_sufragantes),
          foto_path: fotoPath,
          puntaje_nitidez: Number(payload.puntaje_nitidez),
          latitud: Number(payload.latitud),
          longitud: Number(payload.longitud),
          precision_gps: payload.precision_gps !== null ? Number(payload.precision_gps) : null,
          actualizado_por: usuario.id,
        })
        .eq('id', existente.id)
        .select('id')
        .single();

      if (updateErr || !updated) {
        throw new Error(this.supabase.interpretarError(updateErr, 'No se pudo actualizar el acta'));
      }
      actaGuardadaId = updated.id;
    } else {
      const { data: inserted, error: insertErr } = await this.supabase.client
        .from('actas')
        .insert({
          jrv_id: payload.jrv_id,
          dignidad: payload.dignidad,
          nulos: Number(payload.nulos),
          blancos: Number(payload.blancos),
          total_sufragantes: Number(payload.total_sufragantes),
          foto_path: fotoPath,
          puntaje_nitidez: Number(payload.puntaje_nitidez),
          latitud: Number(payload.latitud),
          longitud: Number(payload.longitud),
          precision_gps: payload.precision_gps !== null ? Number(payload.precision_gps) : null,
          registrado_por: usuario.id,
          actualizado_por: usuario.id,
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        throw new Error(this.supabase.interpretarError(insertErr, 'No se pudo registrar el acta'));
      }
      actaGuardadaId = inserted.id;
    }

    const filasVotos = payload.votos.map((v) => ({
      acta_id: actaGuardadaId,
      organizacion_id: v.organizacion_id,
      votos: Number(v.votos),
    }));

    const { error: votosErr } = await this.supabase.client
      .from('acta_votos')
      .upsert(filasVotos, { onConflict: 'acta_id,organizacion_id' });

    if (votosErr) {
      throw new Error(
        this.supabase.interpretarError(votosErr, 'No se pudieron guardar los votos por organizacion')
      );
    }

    const recargada = await this.obtenerActa(payload.jrv_id, payload.dignidad);
    if (!recargada) {
      throw new Error('El acta se guardo pero no se pudo recargar.');
    }
    return recargada;
  }

  private async obtenerUrlFirmada(fotoPath: string): Promise<string | undefined> {
    if (!fotoPath) return undefined;
    const { data, error } = await this.supabase.client.storage
      .from('actas-fotos')
      .createSignedUrl(fotoPath, 3600);
    if (error || !data?.signedUrl) {
      return undefined;
    }
    return data.signedUrl;
  }
}
