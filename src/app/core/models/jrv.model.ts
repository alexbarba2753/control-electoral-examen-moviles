export type EstadoJrv = 'pendiente' | 'parcial' | 'completa';

export interface Jrv {
  id: string;
  recinto_id: string;
  numero: number;
  veedor_id: string | null;
  estado: EstadoJrv;
  created_at?: string;
}

export interface JrvConDetalles extends Jrv {
  recinto_nombre?: string;
  recinto_parroquia?: string;
  veedor_nombre?: string | null;
  veedor_cedula?: string | null;
  tiene_acta_alcalde: boolean;
  tiene_acta_prefecto: boolean;
}
