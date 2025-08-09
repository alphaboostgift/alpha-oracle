// ====== Alpha Oracle Server (Full + MongoDB via Mongoose) ======
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import mongoose from "mongoose";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const SHOP_URL = "https://alphabooststore.com/collections/alphafit-collection";

/* =======================================
   MongoDB (Mongoose)
======================================= */
async function connectMongo() {
  try {
    if (!MONGODB_URI) {
      console.warn("⚠️  MONGODB_URI is missing – will run without DB logging.");
      return;
    }
    await mongoose.connect(MONGODB_URI, {
      dbName: "alphaoracle",
      serverSelectionTimeoutMS: 15000,
    });
    console.log("✅ MongoDB connected (mongoose)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
await connectMongo();

// Model for chat logs
const ChatLog =
  mongoose.connection.readyState === 1
    ? mongoose.model(
        "ChatLog",
        new mongoose.Schema(
          {
            timestamp: Date,
            userMessage: String,
            botReply: String,
            product: String,
            trigger: String,
          },
          { collection: "chat_logs" }
        )
      )
    : null;

/* =======================================
   PRODUCT DATABASE – FULL
   (Постави си целия твой списък тук — без да го режем)
======================================= */
const PRODUCTS = [
  // ---------- FITNESS ----------
  {
    name: "AlphaFit Classic Muscle Tee",
    url: "https://alphabooststore.com/products/alphafit-classic-muscle-tee",
    price: 18.95,
    category: "fitness",
    material: "100% premium cotton",
    sizes: ["S","M","L","XL","2XL"],
    triggers: ["strength","muscles","gym","workout","training","power","muscle tee","alpha fit","everyday"]
  },
  {
    name: "AlphaFit HyperDry Training Tee",
    url: "https://alphabooststore.com/products/alphafit-hyperdry-training-tee",
    price: 17.95,
    category: "fitness",
    material: "quick-dry polyester blend",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["quick dry","quick-dry","summer","hot","heat","lightweight","breathable","polyester","gym shirt","training shirt","sweat"]
  },
  {
    name: "AlphaFit ICE Cotton Tee",
    url: "https://alphabooststore.com/products/alphafit-ice-cotton-tee",
    price: 22.95,
    category: "fitness",
    material: "ICE cotton",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["ice cotton","cool","breathable","summer","hot","heat","light","workout","alpha fit","sweat"]
  },
  {
    name: "AlphaFit IceSilk Performance Tee",
    url: "https://alphabooststore.com/products/alphafit-icesilk-performance-tee",
    price: 18.95,
    category: "fitness",
    material: "IceSilk synthetic",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["icesilk","ice silk","performance","fast dry","quick dry","lightweight","cool","summer","hot","heat","breathable"]
  },
  {
    name: "AlphaFit IceSkin Pro Tee",
    url: "https://alphabooststore.com/products/alphafit-iceskin-pro-tee",
    price: 24.95,
    category: "fitness",
    material: "cotton + synthetic blend",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["iceskin","ice skin","cooling","quick dry","breathable","premium gym tee","summer","hot","heat","pro shirt"]
  },
  {
    name: "AlphaFit Street Series Tee",
    url: "https://alphabooststore.com/products/alphafit-street-series-tee",
    price: 18.95,
    category: "fitness",
    material: "100% cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["streetwear","urban","graphic tee","alpha fit"]
  },
  {
    name: "AlphaFit Sculpted Training Tee",
    url: "https://alphabooststore.com/products/alphafit-sculpted-training-tee",
    price: 17.95,
    category: "fitness",
    material: "stretch cotton blend",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["sculpted","slim fit","training tee","muscle fit","tight","athletic"]
  },
  {
    name: "AlphaFit Long Sleeve Comfort Tee",
    url: "https://alphabooststore.com/products/alphafit-long-sleeve-comfort-tee",
    price: 22.95,
    category: "fitness",
    material: "cotton/poly blend",
    sizes: ["S","M","L","XL","2XL"],
    triggers: ["long sleeve","cool weather","layering","alpha fit","autumn","winter"]
  },

  // ---------- MOTIVATIONAL ----------
  {
    name: "Discipline Over Motivation Tee",
    url: "https://alphabooststore.com/products/discipline-over-motivation-tee",
    price: 22.99,
    category: "motivational",
    material: "100% US cotton",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["discipline","motivation","no excuses","focus","grind","success","consistency"]
  },
  {
    name: "YOU vs YOU – Conquer Your Inner Battles Tee",
    url: "https://alphabooststore.com/products/you-vs-you-conquer-your-inner-battles",
    price: 22.99,
    category: "motivational",
    material: "100% cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["you vs you","inner battles","self discipline","mindset","focus","overcome"]
  },
  {
    name: "My Only Competition Is Me Tee",
    url: "https://alphabooststore.com/products/my-only-competition-is-me-tee",
    price: 22.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["competition","self improvement","focus","discipline","yesterday"]
  },
  {
    name: "No Fear No Limits Tee",
    url: "https://alphabooststore.com/products/no-fear-no-limits-tee",
    price: 24.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["no fear","no limits","fearless","extreme","courage","bold"]
  },
  {
    name: "I Am The Storm Tee",
    url: "https://alphabooststore.com/products/i-am-the-storm-tee",
    price: 24.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["storm","overcome","resilience","power","warrior","thunder"]
  },
  {
    name: "Be Unstoppable Lion Tee",
    url: "https://alphabooststore.com/products/be-unstoppable-lion-tee",
    price: 17.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["unstoppable","lion","courage","determination","alpha"]
  },
  {
    name: "The Triad of Change Transformation Tee",
    url: "https://alphabooststore.com/products/the-triad-of-change-transformation-tee",
    price: 17.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["triad of change","transformation","focus","discipline","balance","system"]
  },

  // ---------- GIFTS & INSPIRATIONAL ----------
  {
    name: "God Knew I Needed an Angel Tee",
    url: "https://alphabooststore.com/products/god-knew-i-needed-an-angel-unisex-comfort-t-shirt-gift-for-husband-wife",
    price: 17.99,
    category: "gift",
    material: "midweight cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["gift","wife","husband","anniversary","love","romantic","partner","marriage","couple","angel","blessing","special occasion","present"]
  },
  {
    name: "God Knew I Needed Hope Tee",
    url: "https://alphabooststore.com/products/god-knew-i-needed-hope-tee",
    price: 22.99,
    category: "gift",
    material: "garment-dyed cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["hope","faith","believe","positive","blessing","pray","church","support","light","good vibes","encouragement"]
  },
  {
    name: "HOPE – Hold On Pain Ends Tee",
    url: "https://alphabooststore.com/products/hope-hold-on-pain-ends-tee",
    price: 24.99,
    category: "gift",
    material: "cotton",
    sizes: ["S","M","L","XL"],
    triggers: ["hope","faith","pain ends","encouragement","angel wings","support"]
  },

  // ---------- BOOK / DIGITAL ----------
  {
    name: "The Triad of Change (Book)",
    url: "https://alphabooststore.com/products/the-triad-of-change-complete-365-day-transformation-system",
    price: 7.99,
    category: "self-help",
    material: "digital eBook",
    sizes: [],
    triggers: ["life change","personal growth","self improvement","transformation","discipline","365"]
  }
];

/* =======================================
   EMOTIONAL TRIGGERS
======================================= */
const TRIGGERS = {
  lost: [
    "Even the strongest warriors lose their way sometimes — let's get you back on track! 💪",
    "Feeling lost is just the first step to finding your real path. 🚀",
  ],
  no_energy: [
    "Energy isn't just physical — it's mental. Let's refuel both! ⚡",
    "Low energy? Time to reignite your fire! 🔥",
  ],
  self_doubt: [
    "Doubt is just the mind's way of testing your will. Prove it wrong! 💥",
    "Believe in yourself for just one more day — it might be the day everything changes. 🌟",
  ],
  love: [
    "Love is the strongest force — and the best reason to surprise them. ❤️",
    "Some gifts speak louder than words — this could be one of them. 💝",
  ],
  motivation: [
    "Motivation fades, discipline stays — let's make it happen today. 🔥",
    "Stay consistent, and results will come before you know it. 💪",
  ],
  courage: [
    "Fear is temporary. Regret is forever — take the step now. ⚔️",
    "True courage is acting in spite of fear. 💥",
  ],
};

/* =======================================
   PRIORITY RULES (intent-based boosts)
======================================= */
const PRIORITY_RULES = [
  // Summer / hot weather
  {
    keywords: [
      "hot weather",
      "hot",
      "heat",
      "summer",
      "quick dry",
      "quick-dry",
      "fast dry",
      "cool",
      "breathable",
      "sweat",
      "lightweight",
    ],
    boostFor: [
      "alphafit hyperdry training tee",
      "alphafit ice cotton tee",
      "alphafit icesilk performance tee",
      "alphafit iceskin pro tee",
    ],
    boostScore: 5,
  },
  // Gift / romantic
  {
    keywords: [
      "gift",
      "present",
      "wife",
      "husband",
      "girlfriend",
      "boyfriend",
      "anniversary",
      "valentine",
      "romantic",
      "partner",
      "marriage",
      "couple",
      "love",
      "special occasion",
      "angel",
      "blessing",
    ],
    boostFor: [
      "god knew i needed an angel tee",
      "god knew i needed hope tee",
      "hope – hold on pain ends tee",
    ],
    boostScore: 5,
  },
  // Motivation / warrior
  {
    keywords: [
      "warrior",
      "fighter",
      "battle",
      "win",
      "never give up",
      "strength",
      "focus",
      "goal",
      "discipline",
      "motivation",
      "overcome",
      "mindset",
      "alpha motivation",
    ],
    boostFor: [
      "you vs you – conquer your inner battles tee",
      "be unstoppable lion tee",
      "the triad of change transformation tee",
      "i am the storm tee",
      "discipline over motivation tee",
      "my only competition is me tee",
      "no fear no limits tee",
    ],
    boostScore: 5,
  },
];

/* =======================================
   HELPERS
======================================= */
function findProduct(message) {
  const msg = message.toLowerCase();

  const activeRules = PRIORITY_RULES.filter((rule) =>
    rule.keywords.some((k) => msg.includes(k))
  );

  let best = null;
  let bestScore = 0;

  for (const p of PRODUCTS) {
    let score = 0;

    for (const t of p.triggers) {
      if (msg.includes(t.toLowerCase())) score += 1;
    }

    for (const rule of activeRules) {
      const boosted = rule.boostFor.some(
        (name) => name === p.name.toLowerCase()
      );
      if (boosted) score += rule.boostScore;
    }

    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }

  if (!best && activeRules.length) {
    const names = new Set(PRODUCTS.map((x) => x.name.toLowerCase()));
    for (const rule of activeRules) {
      const pick = rule.boostFor.find((n) => names.has(n));
      if (pick) return PRODUCTS.find((x) => x.name.toLowerCase() === pick);
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
    if (!OPENAI_API_KEY)
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

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
        { role: "user", content: userMsg },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() || "I'm here.";

    // Save log (if DB is connected)
    if (ChatLog) {
      try {
        await ChatLog.create({
          timestamp: new Date(),
          userMessage: userMsg,
          botReply: reply,
          product: product ? product.name : null,
          trigger: triggerReply || null,
        });
      } catch (e) {
        console.warn("⚠️  Failed to save chat log:", e?.message);
      }
    }

    res.json({ reply });
  } catch (err) {
    console.error("CHAT ERROR:", err?.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================================
   START
======================================= */
app.listen(PORT, () => {
  console.log("Alpha Oracle listening on", PORT);
});
