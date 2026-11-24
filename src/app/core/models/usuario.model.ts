export type RolUsuario = 'provincial' | 'recinto' | 'veedor';

export interface Usuario {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  rol: RolUsuario;
  recinto_id: string | null;
  debe_cambiar_password: boolean;
  created_by?: string | null;
  created_at?: string;
}

export interface CrearUsuarioPayload {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  rol: 'recinto' | 'veedor';
  recinto_id?: string | null;
}

export interface CrearUsuarioRespuesta {
  usuario: Usuario;
  confirmacionEnviada: boolean;
  mensaje: string;
}
