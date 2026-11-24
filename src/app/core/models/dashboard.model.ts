import { Dignidad } from './organizacion.model';

export interface ResultadoCandidato {
  organizacion_id: string;
  sigla: string;
  lista: string;
  organizacion_nombre: string;
  nombre_candidato: string;
  color_hex: string;
  dignidad: Dignidad;
  votos: number;
  porcentaje: number;
}

export interface ResumenAvanceRecinto {
  recinto_id: string;
  recinto_nombre: string;
  parroquia: string;
  canton: string;
  total_jrv: number;
  actas_esperadas: number;
  actas_registradas: number;
  porcentaje_avance: number;
}

export interface ResumenAvanceGlobal {
  total_recintos: number;
  total_jrv: number;
  actas_esperadas: number;
  actas_registradas: number;
  porcentaje_avance: number;
  total_nulos_alcalde: number;
  total_blancos_alcalde: number;
  total_sufragantes_alcalde: number;
  total_nulos_prefecto: number;
  total_blancos_prefecto: number;
  total_sufragantes_prefecto: number;
  resultados_alcalde: ResultadoCandidato[];
  resultados_prefecto: ResultadoCandidato[];
  avance_por_recinto: ResumenAvanceRecinto[];
}
