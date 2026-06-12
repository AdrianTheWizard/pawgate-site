import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

  // 1. Verify the caller is authenticated
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user?.email) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }

  // 2. Verify the caller is in the admins table (server-side check, bypasses RLS)
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: adminRow } = await serviceClient
    .from("admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (!adminRow) {
    return new Response("Forbidden", { status: 403, headers: cors });
  }

  let subject: string, message: string, filter: string;
  try {
    ({ subject, message, filter } = await req.json());
  } catch {
    return new Response("Bad request", { status: 400, headers: cors });
  }

  if (!subject?.trim() || !message?.trim()) {
    return new Response("Missing subject or message", { status: 400, headers: cors });
  }

  // 3. Fetch recipients using service role (not exposed to client)
  const { data: allUsers, error: usersErr } = await serviceClient
    .from("registrations")
    .select("email, newsletter, launch_notify");

  if (usersErr || !allUsers) {
    return new Response("Failed to fetch recipients", { status: 500, headers: cors });
  }

  const targets = filter === "launch"
    ? allUsers.filter((u) => u.launch_notify)
    : allUsers.filter((u) => u.newsletter);

  if (!targets.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const html = buildHtml(subject, message);
  let sent = 0, failed = 0;

  for (let i = 0; i < targets.length; i += 100) {
    const chunk = targets.slice(i, i + 100);
    try {
      const payload = chunk.map((u) => ({ from: FROM, to: u.email, subject, html }));
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (Array.isArray(json.data)) {
        json.data.forEach((r: { id?: string }) => (r.id ? sent++ : failed++));
      } else {
        failed += chunk.length;
      }
    } catch {
      failed += chunk.length;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

function safe(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrap(inner: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0c0b09;font-family:Arial,sans-serif"><div style="max-width:540px;margin:0 auto;background:#161410;border:1px solid #2c2820;border-radius:16px;overflow:hidden"><div style="padding:28px 36px;border-bottom:1px solid #2c2820"><span style="display:inline-flex;align-items:center;gap:8px;font-family:monospace;font-size:15px;font-weight:600;letter-spacing:.12em;color:#ede8dc"><span style="width:8px;height:8px;border-radius:50%;background:#b89a5a;display:inline-block"></span>PAWGATE</span></div><div style="padding:36px">${inner}</div><div style="padding:18px 36px;border-top:1px solid #2c2820;font-size:11px;color:#6a6458;font-family:monospace">© 2026 PawGate · Fra Norge 🇳🇴</div></div></body></html>`;
}

function buildHtml(subject: string, message: string): string {
  const lines = message
    .split("\n")
    .map((l) =>
      l.trim()
        ? `<p style="margin:0 0 14px;color:#8a8070;line-height:1.7;font-size:15px">${safe(l)}</p>`
        : "<br>"
    )
    .join("");
  return wrap(`
    <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#ede8dc">${safe(subject)}</h2>
    ${lines}
    <p style="margin:16px 0 0;font-size:13px;color:#6a6458">Spørsmål? <a href="mailto:hei@pawgate.no" style="color:#b89a5a;text-decoration:none">hei@pawgate.no</a></p>
  `);
}
