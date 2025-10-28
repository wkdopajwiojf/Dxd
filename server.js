import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// CONFIG (อย่าใส่ค่าไว้ตรงนี้ในโปรดักชัน — ใช้ env vars ใน Render)
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const SHARED_SECRET = process.env.SHARED_SECRET || "change_this_secret";

// in-memory queue (เรียบง่าย) — รีสตาร์ทแล้วหาย ถ้าต้องการถาวรให้ใช้ DB
let pendingMessagesForRoblox = [];

// simple auth middleware
function verifyKey(req, res, next) {
  const key = req.header("x-relay-key");
  if (!key || key !== SHARED_SECRET) return res.status(403).json({ error: "forbidden" });
  next();
}

// Roblox -> Discord
app.post("/to-discord", verifyKey, async (req, res) => {
  const { author, text } = req.body;
  if (!author || !text) return res.status(400).json({ error: "missing author or text" });

  const payload = { content: `🎮 **${author}**: ${text}` };

  try {
    const resp = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error("Discord webhook error", resp.status, body);
      return res.status(500).json({ error: "discord_failed" });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("ERR /to-discord", err);
    return res.status(500).json({ error: "internal" });
  }
});

// Discord bot -> relay (bot จะ POST มาที่นี่)
app.post("/from-discord", verifyKey, (req, res) => {
  const { author, text } = req.body;
  if (!author || !text) return res.status(400).json({ error: "missing author or text" });

  pendingMessagesForRoblox.push({ author, text, ts: Date.now() });
  return res.json({ ok: true });
});

// Roblox -> get new messages
app.get("/messages", verifyKey, (req, res) => {
  const out = pendingMessagesForRoblox;
  pendingMessagesForRoblox = [];
  return res.json({ ok: true, messages: out });
});

// health
app.get("/", (req, res) => res.send("Relay alive"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log("Relay listening on", PORT));
