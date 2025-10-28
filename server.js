import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===== CONFIG =====
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1432816819458019491/HkabKcQN1vPkafP4FIf-4no_BcjwHZ-A8hTQfBNHrNJD4ffBE3nv-Rhf2Vm9xNAIVd0G"; // ใส่ของจริง
const SHARED_SECRET = "222554"; // เปลี่ยนให้ยาว/สุ่มเอง

// คิวข้อความรอ Roblox มาดึง
let pendingMessagesForRoblox = [];

// middleware auth โง่ๆ ป้องกันสแปม
function verifyKey(req, res, next) {
const key = req.header("x-relay-key");
if (!key || key !== SHARED_SECRET) {
return res.status(403).json({ error: "forbidden" });
}
next();
}

// Roblox -> Discord
app.post("/to-discord", verifyKey, async (req, res) => {
const { author, text } = req.body;
if (!author || !text) {
return res.status(400).json({ error: "missing author or text" });
}

const payload = {
content: 🎮 **${author}**: ${text}
};

try {
const resp = await fetch(DISCORD_WEBHOOK_URL, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(payload)
});

if (!resp.ok) {  
  const body = await resp.text();  
  console.error("Discord webhook error:", resp.status, body);  
  return res.status(500).json({ error: "discord_failed" });  
}  

return res.json({ ok: true });

} catch (err) {
console.error("ERR /to-discord:", err);
return res.status(500).json({ error: "internal" });
}
});

// Discord bot -> relay
app.post("/from-discord", verifyKey, (req, res) => {
const { author, text } = req.body;
if (!author || !text) {
return res.status(400).json({ error: "missing author or text" });
}

pendingMessagesForRoblox.push({
author,
text,
ts: Date.now()
});

return res.json({ ok: true });
});

// Roblox -> get new messages
app.get("/messages", verifyKey, (req, res) => {
const out = pendingMessagesForRoblox;
pendingMessagesForRoblox = [];
return res.json({ ok: true, messages: out });
});

// test route
app.get("/", (req, res) => {
res.send("Relay server is alive 😎");
});

// IMPORTANT for Render:
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
console.log("Relay server up on port", PORT);
});
