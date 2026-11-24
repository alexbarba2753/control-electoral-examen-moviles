import { Dignidad } from './organizacion.model';

export interface Acta {
  id: string;
  jrv_id: string;
  dignidad: Dignidad;
  nulos: number;
  blancos: number;
  total_sufragantes: number;
  foto_path: string;
  puntaje_nitidez: number;
  latitud: number;
  longitud: number;
  precision_gps: number | null;
  registrado_por: string;
  actualizado_por: string;
  created_at: string;
  updated_at: string;
}

export interface ActaVoto {
  id?: string;
  acta_id?: string;
  organizacion_id: string;
  votos: number;
}

export interface ActaConDetalle extends Acta {
  votos: ActaVoto[];
  foto_url?: string;
  jrv_numero?: number;
  recinto_id?: string;
  recinto_nombre?: string;
  recinto_parroquia?: string;
}

export interface GuardarActaPayload {
  jrv_id: string;
  recinto_id: string;
  dignidad: Dignidad;
  votos: { organizacion_id: string; votos: number }[];
  nulos: number;
  blancos: number;
  total_sufragantes: number;
  foto_data_url?: string;
  foto_path_existente?: string;
  puntaje_nitidez: number;
  latitud: number;
  longitud: number;
  precision_gps: number | null;
}

export interface ResultadoNitidez {
  esNitida: boolean;
  puntaje: number;
  umbral: number;
}

export interface CoordenadasGps {
  latitud: number;
  longitud: number;
  precision: number | null;
}
