import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* ================================
   PRODUCT DATABASE – FULL
================================ */
const PRODUCTS = [
  // FITNESS
  {
    name: "AlphaFit Classic Muscle Tee",
    url: "https://alphabooststore.com/products/alphafit-classic-muscle-tee",
    price: 18.95,
    category: "fitness",
    material: "100% premium cotton",
    sizes: ["S","M","L","XL","2XL"],
    triggers: ["strength","muscles","gym","workout","training","power","muscle tee","alpha fit"]
  },
  {
    name: "AlphaFit HyperDry Training Tee",
    url: "https://alphabooststore.com/products/alphafit-hyperdry-training-tee",
    price: 17.95,
    category: "fitness",
    material: "quick-dry polyester blend",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["quick dry","summer training","lightweight","polyester","gym shirt","training shirt"]
  },
  {
    name: "AlphaFit ICE Cotton Tee",
    url: "https://alphabooststore.com/products/alphafit-ice-cotton-tee",
    price: 22.95,
    category: "fitness",
    material: "ICE cotton",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["cool","breathable","summer","ice cotton","light","workout","alpha fit"]
  },
  {
    name: "AlphaFit IceSilk Performance Tee",
    url: "https://alphabooststore.com/products/alphafit-icesilk-performance-tee",
    price: 18.95,
    category: "fitness",
    material: "IceSilk synthetic",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["icesilk","performance tee","gym performance","fast dry","lightweight","cool shirt"]
  },
  {
    name: "AlphaFit IceSkin Pro Tee",
    url: "https://alphabooststore.com/products/alphafit-iceskin-pro-tee",
    price: 24.95,
    category: "fitness",
    material: "cotton + synthetic blend",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["iceskin","cooling","premium gym tee","pro shirt","breathable"]
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
    triggers: ["sculpted","slim fit","training tee","muscle fit"]
  },
  {
    name: "AlphaFit Long Sleeve Comfort Tee",
    url: "https://alphabooststore.com/products/alphafit-long-sleeve-comfort-tee",
    price: 22.95,
    category: "fitness",
    material: "cotton/poly blend",
    sizes: ["S","M","L","XL","2XL"],
    triggers: ["long sleeve","cool weather","layering","alpha fit"]
  },

  // MOTIVATIONAL
  {
    name: "Discipline Over Motivation Tee",
    url: "https://alphabooststore.com/products/discipline-over-motivation-tee",
    price: 22.99,
    category: "motivational",
    material: "100% US cotton",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["discipline","motivation","no excuses","focus","grind","success"]
  },
  {
    name: "YOU vs YOU – Conquer Your Inner Battles Tee",
    url: "https://alphabooststore.com/products/you-vs-you-conquer-your-inner-battles",
    price: 22.99,
    category: "motivational",
    material: "100% cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["you vs you","inner battles","self discipline","mindset","focus"]
  },
  {
    name: "My Only Competition Is Me Tee",
    url: "https://alphabooststore.com/products/my-only-competition-is-me-tee",
    price: 22.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["competition","self improvement","focus","discipline"]
  },
  {
    name: "No Fear No Limits Tee",
    url: "https://alphabooststore.com/products/no-fear-no-limits-tee",
    price: 24.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["no fear","no limits","fearless","extreme","courage"]
  },
  {
    name: "I Am The Storm Tee",
    url: "https://alphabooststore.com/products/i-am-the-storm-tee",
    price: 24.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["storm","overcome","resilience","power","warrior"]
  },
  {
    name: "Be Unstoppable Lion Tee",
    url: "https://alphabooststore.com/products/be-unstoppable-lion-tee",
    price: 17.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"],
    triggers: ["unstoppable","lion","courage","determination"]
  },
  {
    name: "The Triad of Change Transformation Tee",
    url: "https://alphabooststore.com/products/the-triad-of-change-transformation-tee",
    price: 17.99,
    category: "motivational",
    material: "cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["triad of change","transformation","focus","discipline","balance"]
  },

  // GIFTS & INSPIRATIONAL
  {
    name: "God Knew I Needed an Angel Tee",
    url: "https://alphabooststore.com/products/god-knew-i-needed-an-angel-unisex-comfort-t-shirt-gift-for-husband-wife",
    price: 17.99,
    category: "gift",
    material: "midweight cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["love","faith","wife","husband","gift","anniversary","romantic"]
  },
  {
    name: "God Knew I Needed Hope Tee",
    url: "https://alphabooststore.com/products/god-knew-i-needed-hope-tee",
    price: 22.99,
    category: "gift",
    material: "garment-dyed cotton",
    sizes: ["S","M","L","XL","2XL","3XL"],
    triggers: ["hope","faith","encouragement","gift","inspiration"]
  },
  {
    name: "HOPE – Hold On Pain Ends Tee",
    url: "https://alphabooststore.com/products/hope-hold-on-pain-ends-tee",
    price: 24.99,
    category: "gift",
    material: "cotton",
    sizes: ["S","M","L","XL"],
    triggers: ["hope","faith","pain ends","encouragement"]
  }
];

/* ================================
   EMOTIONAL TRIGGERS – VARIATIONS
================================ */
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
/* ================================
   HELPER FUNCTIONS
================================ */
function findProduct(message) {
  const lowerMsg = message.toLowerCase();
  return PRODUCTS.find(p =>
    p.triggers.some(t => lowerMsg.includes(t))
  );
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

/* ================================
   ROUTES
================================ */
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
Reply in max 2 sentences, mix motivation with subtle sales.
If product info is provided, include it naturally.
If no product match, point to AlphaFit Collection: https://alphabooststore.com/collections/alphafit-collection
Tone: motivating, confident, helpful.
` + context;

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
    res.json({ reply });
  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log("Alpha Oracle listening on", PORT);
});

