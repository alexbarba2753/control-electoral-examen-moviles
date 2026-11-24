export type Dignidad = 'alcalde' | 'prefecto';

export interface Organizacion {
  id: string;
  nombre: string;
  sigla: string;
  lista: string;
  color_hex: string;
  orden: number;
}

export interface Candidatura {
  id: string;
  organizacion_id: string;
  dignidad: Dignidad;
  nombre_candidato: string;
}

export interface OrganizacionConCandidatura extends Organizacion {
  nombre_candidato: string;
  dignidad: Dignidad;
}
