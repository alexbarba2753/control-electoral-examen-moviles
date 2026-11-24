export interface Recinto {
  id: string;
  provincia: string;
  canton: string;
  parroquia: string;
  nombre: string;
  cantidad_jrv: number;
  created_at?: string;
}

export interface CrearRecintoPayload {
  provincia: string;
  canton: string;
  parroquia: string;
  nombre: string;
  cantidad_jrv: number;
}

export interface RecintoConResumen extends Recinto {
  coordinador_nombre?: string | null;
  coordinador_id?: string | null;
  jrv_completas: number;
  jrv_parciales: number;
  jrv_pendientes: number;
  actas_registradas: number;
  actas_esperadas: number;
}
