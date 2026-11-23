import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = await req.json();
    const action = payload?.action ?? "login";

    if (action === "recuperar") {
      const identificador = String(payload?.identificador ?? "").trim();
      const redirectTo = payload?.redirectTo ? String(payload.redirectTo) : undefined;
      if (!identificador) {
        return jsonResponse({ error: "Debe ingresar su cedula o correo" }, 400);
      }

      let correo: string | null = null;
      if (/^[0-9]{10}$/.test(identificador)) {
        const { data } = await adminClient
          .from("usuarios")
          .select("correo")
          .eq("cedula", identificador)
          .maybeSingle();
        correo = data?.correo ?? null;
      } else if (identificador.includes("@")) {
        const { data } = await adminClient
          .from("usuarios")
          .select("correo")
          .eq("correo", identificador.toLowerCase())
          .maybeSingle();
        correo = data?.correo ?? null;
      }

      if (correo) {
        const { error: resetErr } = await anonClient.auth.resetPasswordForEmail(
          correo,
          redirectTo ? { redirectTo } : undefined
        );
        if (resetErr) {
          return jsonResponse(
            { error: `No se pudo enviar el correo de recuperacion: ${resetErr.message}` },
            429
          );
        }
      }

      return jsonResponse({
        mensaje: "Si la cuenta existe, se envio un enlace de recuperacion al correo registrado.",
      });
    }

    const cedula = String(payload?.cedula ?? "").trim();
    const password = String(payload?.password ?? "");

    if (!/^[0-9]{10}$/.test(cedula) || !password) {
      return jsonResponse({ error: "Cedula y contrasena obligatorias" }, 400);
    }

    const { data: usuario, error: userErr } = await adminClient
      .from("usuarios")
      .select("id, cedula, nombres, apellidos, telefono, correo, rol, recinto_id, debe_cambiar_password")
      .eq("cedula", cedula)
      .maybeSingle();

    if (userErr || !usuario) {
      return jsonResponse({ error: "Credenciales invalidas" }, 401);
    }

    const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
      email: usuario.correo,
      password,
    });

    if (authErr || !authData.session) {
      return jsonResponse({ error: "Credenciales invalidas" }, 401);
    }

    return jsonResponse({
      session: authData.session,
      usuario,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return jsonResponse({ error: message }, 500);
  }
});
