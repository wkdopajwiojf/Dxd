import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// --- CONFIG ---
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const SHARED_SECRET = process.env.SHARED_SECRET || "my_secret";

let pending = [];

// verify key
function verifyKey(req, res, next) {
  const k = req.header("x-relay-key");
  if (k !== SHARED_SECRET) return res.status(403).json({error:"forbidden"});
  next();
}

// Roblox → Discord
app.post("/to-discord", verifyKey, async (req,res)=>{
  const {author,text}=req.body;
  const payload={content:`🎮 **${author}**: ${text}`};
  await fetch(DISCORD_WEBHOOK_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  res.json({ok:true});
});

// Discord → Roblox
app.post("/from-discord", verifyKey,(req,res)=>{
  const {author,text}=req.body;
  pending.push({author,text});
  res.json({ok:true});
});

// Roblox polling
app.get("/messages",verifyKey,(req,res)=>{
  const out=pending;
  pending=[];
  res.json({ok:true,messages:out});
});

app.get("/",(_,res)=>res.send("Dxd relay online ✅"));

// สำคัญสำหรับ Render
const PORT=process.env.PORT||10000;
app.listen(PORT,"0.0.0.0",()=>console.log("Relay listening",PORT));
