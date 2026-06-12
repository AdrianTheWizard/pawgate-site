import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const FROM = "PawGate <hei@pawgate.no>";
const ALLOWED_ORIGIN = "https://pawgate.no";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }

  // Verify the caller is a real authenticated Supabase user
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }

  let type: string;
  try {
    ({ type } = await req.json());
  } catch {
    return new Response("Bad request", { status: 400, headers: cors });
  }

  const to = user.email;
  const name = (user.user_metadata?.name as string | undefined) || to.split("@")[0];

  let subject: string, html: string;
  if (type === "welcome") {
    subject = "Velkommen til PawGate! 🐾";
    html = welcomeHtml(name);
  } else if (type === "password_changed") {
    subject = "Passordet ditt er endret — PawGate";
    html = passwordChangedHtml(to);
  } else {
    return new Response("Unknown type", { status: 400, headers: cors });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
    return new Response("Email failed", { status: 500, headers: cors });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

function safe(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrap(inner: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0c0b09;font-family:Arial,sans-serif"><div style="max-width:540px;margin:0 auto;background:#161410;border:1px solid #2c2820;border-radius:16px;overflow:hidden"><div style="padding:28px 36px;border-bottom:1px solid #2c2820"><span style="display:inline-flex;align-items:center;gap:8px;font-family:monospace;font-size:15px;font-weight:600;letter-spacing:.12em;color:#ede8dc"><span style="width:8px;height:8px;border-radius:50%;background:#b89a5a;display:inline-block"></span>PAWGATE</span></div><div style="padding:36px">${inner}</div><div style="padding:18px 36px;border-top:1px solid #2c2820;font-size:11px;color:#6a6458;font-family:monospace">© 2026 PawGate · Fra Norge 🇳🇴</div></div></body></html>`;
}

function welcomeHtml(name: string): string {
  return wrap(`
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ede8dc">Hei ${safe(name)}!</h2>
    <p style="margin:0 0 20px;color:#8a8070;line-height:1.7;font-size:15px">Takk for at du registrerte deg hos PawGate. Du er nå på listen og vil få beskjed så snart appen er klar for nedlasting.</p>
    <div style="background:#1e1c16;border:1px solid #2c2820;border-radius:12px;padding:20px 24px;margin-bottom:24px">
      <div style="font-size:11px;color:#b89a5a;font-family:monospace;letter-spacing:.12em;margin-bottom:8px;text-transform:uppercase">Hva skjer nå?</div>
      <p style="margin:0;font-size:14px;color:#ede8dc;line-height:1.65">Vi jobber med å ferdigstille PawGate — smart kennelstyring for seriøse kenneleiere. Du hører fra oss!</p>
    </div>
    <p style="margin:0;font-size:13px;color:#6a6458;line-height:1.6">Spørsmål? Ta kontakt på <a href="mailto:hei@pawgate.no" style="color:#b89a5a;text-decoration:none">hei@pawgate.no</a></p>
  `);
}

function passwordChangedHtml(email: string): string {
  return wrap(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#ede8dc">Passord endret</h2>
    <p style="margin:0 0 16px;color:#8a8070;line-height:1.7;font-size:15px">Vi bekrefter at passordet for <strong style="color:#ede8dc">${safe(email)}</strong> nettopp ble endret.</p>
    <p style="margin:0 0 24px;color:#8a8070;line-height:1.7;font-size:15px">Hvis du ikke gjorde dette, ta kontakt med oss umiddelbart.</p>
    <a href="mailto:hei@pawgate.no" style="display:inline-block;padding:12px 24px;background:#b89a5a;color:#0c0b09;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px">Kontakt support</a>
  `);
}
