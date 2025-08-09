// ====== Alpha Oracle Server (Full + MongoDB) ======
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI || "your_mongodb_connection_string_here";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const SHOP_URL = "https://alphabooststore.com/collections/alphafit-collection";

// ===== MongoDB Connection =====
let db;
async function connectMongo() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db("alphaoracle");
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
connectMongo();

/* =======================================
   PRODUCT DATABASE – FULL
======================================= */
const PRODUCTS = [
  // ... (тук остава целият ти продукт списък, който ми прати)
];

/* =======================================
   EMOTIONAL TRIGGERS – VARIATIONS
======================================= */
const TRIGGERS = {
  lost: [
    "Even the strongest warriors lose their way sometimes — let's get you back on track! 💪",
    "Feeling lost is just the first step to finding your real path. 🚀"
  ],
  no_energy: [
    "Energy isn't just physical — it's mental. Let's refuel both! ⚡",
    "Low energy? Time to reignite your fire! 🔥"
  ],
  self_doubt: [
    "Doubt is just the mind's way of testing your will. Prove it wrong! 💥",
    "Believe in yourself for just one more day — it might be the day everything changes. 🌟"
  ],
  love: [
    "Love is the strongest force — and the best reason to surprise them. ❤️",
    "Some gifts speak louder than words — this could be one of them. 💝"
  ],
  motivation: [
    "Motivation fades, discipline stays — let's make it happen today. 🔥",
    "Stay consistent, and results will come before you know it. 💪"
  ],
  courage: [
    "Fear is temporary. Regret is forever — take the step now. ⚔️",
    "True courage is acting in spite of fear. 💥"
  ]
};

/* =======================================
   PRIORITY RULES (intent-based boosts)
======================================= */
const PRIORITY_RULES = [
  // ... (тук остава твоят оригинален списък с правила)
];

/* =======================================
   HELPERS
======================================= */
function findProduct(message) {
  const msg = message.toLowerCase();
  const activeRules = PRIORITY_RULES.filter(rule =>
    rule.keywords.some(k => msg.includes(k))
  );

  let best = null;
  let bestScore = 0;

  for (const p of PRODUCTS) {
    let score = 0;
    for (const t of p.triggers) {
      if (msg.includes(t.toLowerCase())) score += 1;
    }
    for (const rule of activeRules) {
      const boosted = rule.boostFor.some(name => name === p.name.toLowerCase());
      if (boosted) score += rule.boostScore;
    }
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  if (!best && activeRules.length) {
    const names = new Set(PRODUCTS.map(x => x.name.toLowerCase()));
    for (const rule of activeRules) {
      const pick = rule.boostFor.find(n => names.has(n));
      if (pick) return PRODUCTS.find(x => x.name.toLowerCase() === pick);
    }
  }
  return best || null;
}

function getTriggerReply(message) {
  const lowerMsg = message.toLowerCase();
  for (const [trigger, replies] of Object.entries(TRIGGERS)) {
    if (lowerMsg.includes(trigger)) {
      return replies[Math.floor(Math.random() * replies.length)];
    }
  }
  return null;
}

/* =======================================
   ROUTES
======================================= */
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/chat", async (req, res) => {
  try {
    const userMsg = String(req.body?.message || "").slice(0, 500);
    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const product = findProduct(userMsg);
    const triggerReply = getTriggerReply(userMsg);

    let context = "";
    if (product) {
      context += `Recommend this product: ${product.name} - ${product.url} - Price: $${product.price}\nMaterial: ${product.material}\nSizes: ${product.sizes.join(", ")}\n`;
    }
    if (triggerReply) {
      context += `Use this motivational line: "${triggerReply}"\n`;
    }

    const systemPrompt = `
You are Alpha Oracle for AlphaBoostStore.
Reply ULTRA-CONCISE (max 2 sentences). Be motivating and subtly sales-driven.
If product info is provided, include it naturally.
If no product match, point to AlphaFit Collection with free US shipping and $5.99 worldwide: ${SHOP_URL}
Tone: motivating, confident, helpful.
${context}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 90,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg }
      ]
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "I'm here.";

    // ===== Запазване в MongoDB =====
    if (db) {
      await db.collection("chat_logs").insertOne({
        timestamp: new Date(),
        userMessage: userMsg,
        botReply: reply,
        product: product ? product.name : null,
        trigger: triggerReply || null
      });
    }

    res.json({ reply });
  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================================
   START
======================================= */
app.listen(PORT, () => {
  console.log("Alpha Oracle listening on", PORT);
});
