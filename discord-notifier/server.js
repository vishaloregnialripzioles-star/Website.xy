import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = Number(process.env.PORT || 10000);
const siteOrigin = process.env.SITE_ORIGIN || "https://website-xy.onrender.com";
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: siteOrigin, methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Authorization", "Content-Type", "apikey"] }));
app.use(express.json({ limit: "16kb" }));
app.use("/api/notify", rateLimit({ windowMs: 60_000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false }));

const requiredEnv = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DISCORD_WEBHOOK_URL"];
function getClients() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) throw new Error("Missing server environment configuration: " + missing.join(", "));
  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return { userClient, adminClient };
}
const clip = (value, max = 1024) => {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text || "Not provided";
};

app.get("/health", (_req, res) => res.status(200).json({ ok: true, service: "xy-studio-discord-notifier" }));
app.post("/api/notify", async (req, res) => {
  try {
    const { userClient, adminClient } = getClients();
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!/^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w.-]+/.test(webhookUrl)) {
      return res.status(503).json({ error: "Discord webhook configuration is invalid." });
    }
    const authHeader = req.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: "Sign in is required." });
    const { data: authData, error: authError } = await userClient.auth.getUser(match[1]);
    if (authError || !authData?.user) return res.status(401).json({ error: "Your session could not be verified. Please sign in again." });

    const applicationId = String(req.body?.application_id || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId)) {
      return res.status(400).json({ error: "A valid application ID is required." });
    }
    const { data: application, error: dbError } = await adminClient
      .from("applications")
      .select("id,reference_id,user_id,service,purpose,reference_notes,budget,timeline,contact,created_at")
      .eq("id", applicationId)
      .eq("user_id", authData.user.id)
      .single();
    if (dbError || !application) return res.status(404).json({ error: "Application not found for this account." });

    const fields = [
      { name: "Reference ID", value: clip(application.reference_id, 200), inline: true },
      { name: "Service", value: clip(application.service, 200), inline: true },
      { name: "Customer contact", value: clip(application.contact, 500), inline: true },
      { name: "Budget", value: clip(application.budget, 500), inline: true },
      { name: "Timeline", value: clip(application.timeline, 500), inline: true },
      { name: "Project details", value: clip(application.purpose), inline: false },
      { name: "References / extra notes", value: clip(application.reference_notes), inline: false }
    ];
    const discordResponse = await fetch(webhookUrl, {
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
          timestamp: application.created_at || new Date().toISOString()
        }]
      })
    });
    if (!discordResponse.ok) {
      const detail = await discordResponse.text();
      console.error("Discord webhook returned HTTP", discordResponse.status, detail.slice(0, 500));
      return res.status(502).json({ error: "Discord did not accept the notification. Your application is still saved." });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Notification API error:", error?.message || error);
    return res.status(500).json({ error: "Notification service is temporarily unavailable. Your application is still saved." });
  }
});

app.listen(port, "0.0.0.0", () => console.log(`XY Studio notification API listening on ${port}`));
