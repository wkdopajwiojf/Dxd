import express from "express";
import fetch from "node-fetch";
import fs from "fs";
const LOG_FILE = "messages.json";

let messages = [];
let nextId = 1;

// โหลด log ตอนเริ่ม
if (fs.existsSync(LOG_FILE)) {
  messages = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  nextId = messages.length > 0 ? messages[messages.length - 1].id + 1 : 1;
}

function saveMessages() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(messages.slice(-50), null, 2));
}

const app = express();
app.use(express.json());

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const SHARED_SECRET = process.env.SHARED_SECRET || "222554";

// ตรวจ key
function verifyKey(req, res, next) {
  const k = req.header("x-relay-key");
  if (k !== SHARED_SECRET) return res.status(403).json({ error: "forbidden" });
  next();
}

// Roblox -> Discord + broadcast
app.post("/to-discord", verifyKey, async (req, res) => {
  const { author, text } = req.body || {};
  if (!text || !author) return res.status(400).json({ error: "missing" });

  // ✅ เช็คถ้าเป็นข้อความเดิมล่าสุดของคนเดียวกัน จะไม่ส่งซ้ำ
  const last = messages[messages.length - 1];
  if (last && last.author === author && last.text === text) {
    return res.json({ ok: true, skipped: true });
  }

  const msg = { id: nextId++, author, text, ts: Date.now() };
  messages.push(msg);
  if (messages.length > 50) messages.shift();
  saveMessages();

  // ส่งไป Discord
  if (DISCORD_WEBHOOK_URL) {
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `🎮 **${author}**: ${text}` })
      });
    } catch (err) {
      console.error("Discord webhook error:", err.message);
    }
  }

  res.json({ ok: true });
});

// Discord -> Roblox
app.post("/from-discord", verifyKey, (req, res) => {
  const { author, text } = req.body || {};
  if (!text || !author) return res.status(400).json({ error: "missing" });

  const msg = { id: nextId++, author: `[Discord] ${author}`, text, ts: Date.now() };
  messages.push(msg);
  if (messages.length > 50) messages.shift();
  saveMessages();
  res.json({ ok: true });
});

// Roblox polling
app.get("/messages", verifyKey, (req, res) => {
  res.json({ ok: true, messages });
});

// Endpoint ปลุกเซิร์ฟ
app.get("/keepalive", (_, res) => res.json({ ok: true, awake: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () =>
  console.log("🌍 Global Relay running on", PORT)
);
