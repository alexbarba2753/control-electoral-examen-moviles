import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gmympwlcoeuyxdousikt.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdteW1wd2xjb2V1eXhkb3VzaWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1NjY4NjUsImV4cCI6MjExMTE0Mjg2NX0.sdu6hIAMhaEufJGK2mUih14cUuDXGeQu223tVfJFCs4';

function crearCliente() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loginConCedula(client, cedula, password) {
  const { data, error } = await client.functions.invoke('login-cedula', {
    body: { action: 'login', cedula, password },
  });
  if (error || !data?.session) {
    throw new Error(`Fallo login ${cedula}: ${error?.message ?? JSON.stringify(data)}`);
  }
  const { error: setErr } = await client.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (setErr) throw setErr;
  return data.usuario;
}

async function crearUsuarioSiNoExiste(client, payload) {
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  const { data, error } = await client.functions.invoke('crear-usuario', {
    body: payload,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    if (error.context && typeof error.context.json === 'function') {
      const body = await error.context.json().catch(() => null);
      if (body?.error && /ya existe/i.test(body.error)) {
        return { yaExistia: true };
      }
      throw new Error(body?.error || error.message);
    }
    throw error;
  }
  return { yaExistia: false, usuario: data.usuario };
}

async function asegurarLoginYClave(client, cedula, nuevaClave) {
  try {
    const u = await loginConCedula(client, cedula, nuevaClave);
    return u;
  } catch {
    const u = await loginConCedula(client, cedula, 'Ecuador2026');
    const { error: updErr } = await client.auth.updateUser({ password: nuevaClave });
    if (updErr) throw updErr;
    const { error: dbErr } = await client
      .from('usuarios')
      .update({ debe_cambiar_password: false })
      .eq('id', u.id);
    if (dbErr) throw dbErr;
    return { ...u, debe_cambiar_password: false };
  }
}

async function main() {
  console.log('1. Iniciando sesion como Coordinador Provincial...');
  const clientProv = crearCliente();
  await loginConCedula(clientProv, '1710034065', 'Provincial2026!');

  const { data: recintos, error: recErr } = await clientProv
    .from('recintos')
    .select('id, nombre, cantidad_jrv')
    .order('nombre', { ascending: true });
  if (recErr || !recintos?.length) throw new Error('No se cargaron los recintos iniciales (R1)');
  console.log(`   Recintos cargados: ${recintos.length}`);

  const recintoPrueba = recintos[0];
  console.log(`2. Creando Coordinador de Recinto para ${recintoPrueba.nombre}...`);
  await crearUsuarioSiNoExiste(clientProv, {
    cedula: '1710034073',
    nombres: 'Lucia',
    apellidos: 'Cardenas',
    telefono: '0987654321',
    correo: 'coord.recinto.demo@gmail.com',
    rol: 'recinto',
    recinto_id: recintoPrueba.id,
  });

  console.log('3. Autenticando Coordinador de Recinto y creando 2 Veedores...');
  const clientRec = crearCliente();
  await asegurarLoginYClave(clientRec, '1710034073', 'Recinto2026!');

  await crearUsuarioSiNoExiste(clientRec, {
    cedula: '1710034081',
    nombres: 'Diego',
    apellidos: 'Paredes',
    telefono: '0981112233',
    correo: 'veedor.uno.demo@gmail.com',
    rol: 'veedor',
  });

  await crearUsuarioSiNoExiste(clientRec, {
    cedula: '1710034099',
    nombres: 'Camila',
    apellidos: 'Rojas',
    telefono: '0984445566',
    correo: 'veedor.dos.demo@gmail.com',
    rol: 'veedor',
  });

  const { data: veedores } = await clientRec
    .from('usuarios')
    .select('id, cedula')
    .eq('rol', 'veedor');
  const veedor1 = veedores.find((v) => v.cedula === '1710034081');
  const veedor2 = veedores.find((v) => v.cedula === '1710034099');

  const { data: mesas } = await clientRec
    .from('jrv')
    .select('id, numero')
    .eq('recinto_id', recintoPrueba.id)
    .order('numero', { ascending: true });

  const jrv1 = mesas[0];
  const jrv2 = mesas[1];

  await clientRec.from('jrv').update({ veedor_id: veedor1.id }).eq('id', jrv1.id);
  await clientRec.from('jrv').update({ veedor_id: veedor2.id }).eq('id', jrv2.id);
  console.log(`   JRV #${jrv1.numero} -> Veedor 1 | JRV #${jrv2.numero} -> Veedor 2`);

  console.log('4. Verificando aislamiento RLS (R8) para Veedor 1...');
  const clientV1 = crearCliente();
  const perfilV1 = await asegurarLoginYClave(clientV1, '1710034081', 'Veedor12026!');

  const { data: mesasV1 } = await clientV1.from('jrv').select('id, numero, veedor_id');
  if (!mesasV1 || mesasV1.length !== 1 || mesasV1[0].id !== jrv1.id) {
    throw new Error(`Fallo RLS SELECT jrv para Veedor 1: ${JSON.stringify(mesasV1)}`);
  }

  const { data: consultaAjena } = await clientV1.from('jrv').select('id').eq('id', jrv2.id);
  if ((consultaAjena ?? []).length !== 0) {
    throw new Error('Fallo RLS: Veedor 1 pudo consultar una JRV asignada al Veedor 2');
  }

  const { error: insertAjenoErr } = await clientV1.from('actas').insert({
    jrv_id: jrv2.id,
    dignidad: 'alcalde',
    nulos: 0,
    blancos: 0,
    total_sufragantes: 0,
    foto_path: `${recintoPrueba.id}/${jrv2.id}/alcalde.jpg`,
    puntaje_nitidez: 150,
    latitud: -0.180653,
    longitud: -78.467838,
    precision_gps: 10,
    registrado_por: perfilV1.id,
    actualizado_por: perfilV1.id,
  });

  if (!insertAjenoErr) {
    throw new Error('Fallo RLS: Veedor 1 pudo insertar un acta en una mesa ajena');
  }
  console.log(`   OK: Bloqueo RLS confirmado al insertar en JRV ajena (${insertAjenoErr.code}: ${insertAjenoErr.message})`);

  console.log('5. Verificando aislamiento RLS (R8) para Veedor 2...');
  const clientV2 = crearCliente();
  await asegurarLoginYClave(clientV2, '1710034099', 'Veedor22026!');
  const { data: mesasV2 } = await clientV2.from('jrv').select('id, numero');
  if (!mesasV2 || mesasV2.length !== 1 || mesasV2[0].id !== jrv2.id) {
    throw new Error(`Fallo RLS SELECT jrv para Veedor 2: ${JSON.stringify(mesasV2)}`);
  }

  console.log('PRUEBA R8 COMPLETADA CON EXITO: ningun veedor puede leer ni escribir mesas ajenas.');
}

main().catch((err) => {
  console.error('ERROR EN PRUEBA RLS:', err);
  process.exit(1);
});
