import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PASSWORD_INICIAL = "Ecuador2026";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validarCedulaEcuatoriana(cedula: string): boolean {
  if (!/^[0-9]{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.substring(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  const tercerDigito = Number(cedula[2]);
  if (tercerDigito >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = Number(cedula[i]) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }
  const residuo = suma % 10;
  const verificador = residuo === 0 ? 0 : 10 - residuo;
  return verificador === Number(cedula[9]);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return jsonResponse({ error: "No autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: tokenErr } = await adminClient.auth.getUser(token);
    if (tokenErr || !userData.user) {
      return jsonResponse({ error: "Sesion invalida o expirada" }, 401);
    }

    const { data: solicitante, error: solErr } = await adminClient
      .from("usuarios")
      .select("id, rol, recinto_id")
      .eq("id", userData.user.id)
      .single();

    if (solErr || !solicitante) {
      return jsonResponse({ error: "Perfil del solicitante no encontrado" }, 403);
    }

    const body = await req.json();
    const cedula = String(body?.cedula ?? "").trim();
    const nombres = String(body?.nombres ?? "").trim();
    const apellidos = String(body?.apellidos ?? "").trim();
    const telefono = String(body?.telefono ?? "").trim();
    const correo = String(body?.correo ?? "").trim().toLowerCase();
    const rolSolicitado = String(body?.rol ?? "").trim();
    let recintoId: string | null = body?.recinto_id ? String(body.recinto_id).trim() : null;

    if (!validarCedulaEcuatoriana(cedula)) {
      return jsonResponse({ error: "La cedula ecuatoriana no es valida" }, 400);
    }
    if (!nombres || !apellidos || !telefono || !correo.includes("@")) {
      return jsonResponse({ error: "Complete todos los campos obligatorios" }, 400);
    }

    if (solicitante.rol === "provincial") {
      if (rolSolicitado !== "recinto") {
        return jsonResponse({ error: "El coordinador provincial solo puede crear coordinadores de recinto" }, 403);
      }
    } else if (solicitante.rol === "recinto") {
      if (rolSolicitado !== "veedor") {
        return jsonResponse({ error: "El coordinador de recinto solo puede crear veedores" }, 403);
      }
      if (!solicitante.recinto_id) {
        return jsonResponse({ error: "El coordinador no tiene un recinto asignado" }, 400);
      }
      recintoId = solicitante.recinto_id;
    } else {
      return jsonResponse({ error: "No tiene permisos para crear cuentas" }, 403);
    }

    const { data: existente } = await adminClient
      .from("usuarios")
      .select("id")
      .or(`cedula.eq.${cedula},correo.eq.${correo}`)
      .maybeSingle();

    if (existente) {
      return jsonResponse({ error: "Ya existe un usuario con esa cedula o correo" }, 409);
    }

    if (rolSolicitado === "recinto" && recintoId) {
      const { data: coordExistente } = await adminClient
        .from("usuarios")
        .select("id")
        .eq("rol", "recinto")
        .eq("recinto_id", recintoId)
        .maybeSingle();
      if (coordExistente) {
        return jsonResponse({ error: "El recinto seleccionado ya tiene un coordinador asignado" }, 409);
      }
    }

    const { data: creadoAuth, error: createAuthErr } = await adminClient.auth.admin.createUser({
      email: correo,
      password: PASSWORD_INICIAL,
      email_confirm: true,
      user_metadata: { nombres, apellidos, cedula },
    });

    if (createAuthErr || !creadoAuth.user) {
      return jsonResponse(
        { error: createAuthErr?.message ?? "No se pudo crear la cuenta en autenticacion" },
        400
      );
    }

    const { data: perfilCreado, error: insertErr } = await adminClient
      .from("usuarios")
      .insert({
        id: creadoAuth.user.id,
        cedula,
        nombres,
        apellidos,
        telefono,
        correo,
        rol: rolSolicitado,
        recinto_id: recintoId,
        debe_cambiar_password: true,
        created_by: solicitante.id,
      })
      .select("*")
      .single();

    if (insertErr) {
      await adminClient.auth.admin.deleteUser(creadoAuth.user.id);
      return jsonResponse({ error: insertErr.message }, 400);
    }

    let confirmacionEnviada = false;
    try {
      const { error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: correo,
      });
      confirmacionEnviada = !linkErr;
    } catch {
      confirmacionEnviada = false;
    }

    return jsonResponse(
      {
        usuario: perfilCreado,
        confirmacionEnviada,
        mensaje: "Cuenta creada con clave inicial Ecuador2026 y cambio obligatorio en primer acceso.",
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return jsonResponse({ error: message }, 500);
  }
});
