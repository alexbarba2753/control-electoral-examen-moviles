insert into public.recintos (provincia, canton, parroquia, nombre, cantidad_jrv) values
  ('Pichincha', 'Quito', 'Iñaquito', 'Colegio Nacional Benalcázar', 4),
  ('Pichincha', 'Quito', 'Mariscal Sucre', 'Escuela Politécnica Nacional - Edificio EARME', 4),
  ('Pichincha', 'Quito', 'Centro Histórico', 'Colegio Nacional Mejía', 4),
  ('Pichincha', 'Quito', 'Chillogallo', 'Unidad Educativa Fiscal Quitumbe', 3),
  ('Pichincha', 'Quito', 'Carcelén', 'Unidad Educativa Réplica Montúfar', 3),
  ('Pichincha', 'Quito', 'Cumbayá', 'Unidad Educativa Cumbayá', 3)
on conflict (canton, parroquia, nombre) do nothing;

insert into public.organizaciones (nombre, sigla, lista, color_hex, orden) values
  ('Movimiento Unidad Democrática', 'MUD', 'Lista 11', '#1D4ED8', 1),
  ('Alianza Progreso Ciudadano', 'APC', 'Lista 23', '#059669', 2),
  ('Partido Renovación Nacional', 'PRN', 'Lista 35', '#D97706', 3),
  ('Frente Social Andino', 'FSA', 'Lista 42', '#DC2626', 4),
  ('Movimiento Futuro Pichincha', 'MFP', 'Lista 58', '#7C3AED', 5)
on conflict (sigla) do nothing;

insert into public.candidaturas (organizacion_id, dignidad, nombre_candidato)
select o.id, v.dignidad, v.nombre_candidato
from (values
  ('MUD', 'alcalde', 'Carlos Andrés Cevallos'),
  ('APC', 'alcalde', 'María Fernanda Paredes'),
  ('PRN', 'alcalde', 'Diego Alejandro Viteri'),
  ('FSA', 'alcalde', 'Sofía Carolina Morales'),
  ('MFP', 'alcalde', 'Esteban Xavier Quiñónez'),
  ('MUD', 'prefecto', 'Patricia Isabel Herrera'),
  ('APC', 'prefecto', 'Roberto Javier Salazar'),
  ('PRN', 'prefecto', 'Gabriela Alejandra Núñez'),
  ('FSA', 'prefecto', 'Fernando José Benítez'),
  ('MFP', 'prefecto', 'Valeria Cristina Tapia')
) as v(sigla, dignidad, nombre_candidato)
join public.organizaciones o on o.sigla = v.sigla
on conflict (organizacion_id, dignidad) do nothing;
