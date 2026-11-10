import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const clip = (value: unknown, max = 1024) => {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text || "Not provided";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!webhookUrl || !supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Notification function is not fully configured." }, 503);
    if (!/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w.-]+/.test(webhookUrl)) return json({ error: "The Discord webhook URL is invalid." }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) return json({ error: "Sign in is required." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: "Bearer " + accessToken } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !authData.user) return json({ error: "Your session could not be verified." }, 401);

    const body = await req.json().catch(() => ({}));
    const applicationId = String(body?.application_id || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId)) return json({ error: "A valid application ID is required." }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: application, error: applicationError } = await adminClient
      .from("applications")
      .select("id,reference_id,user_id,service,purpose,reference_notes,budget,timeline,contact,created_at")
      .eq("id", applicationId)
      .eq("user_id", authData.user.id)
      .single();
    if (applicationError || !application) return json({ error: "Application not found for this account." }, 404);

    const fields = [
      { name: "Reference ID", value: clip(application.reference_id, 200), inline: true },
      { name: "Service", value: clip(application.service, 200), inline: true },
      { name: "Customer contact", value: clip(application.contact, 500), inline: true },
      { name: "Budget", value: clip(application.budget, 500), inline: true },
      { name: "Timeline", value: clip(application.timeline, 500), inline: true },
      { name: "Project details", value: clip(application.purpose), inline: false },
      { name: "References / extra notes", value: clip(application.reference_notes), inline: false },
    ];
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "XY Studio • New Application",
        allowed_mentions: { parse: [] },
        embeds: [{
          title: "📩 New project application",
          description: "A new request has been submitted through the XY Studio website.",
          color: 0x3988d4,
          fields,
          footer: { text: "XY Studio • Application notifications" },
          timestamp: application.created_at || new Date().toISOString(),
        }],
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Discord webhook rejected notification:", response.status, detail);
      return json({ error: "Discord could not accept the notification." }, 502);
    }
    return json({ ok: true });
  } catch (error) {
    console.error("notify-discord error:", error);
    return json({ error: "Unexpected notification error." }, 500);
  }
});
