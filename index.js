// ====== Alpha Oracle Server (Complete + MongoDB via Mongoose) ======
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
const SHOP_URL = "https://alphabooststore.com/collections/special-deals";

/* =======================================
   MongoDB (Mongoose) - Optional Logging
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
   PRODUCT DATABASE – COMPLETE
======================================= */
const PRODUCTS = [
  // ---------- FITNESS (AlphaFit Collection) ----------
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
  },

  // ---------- SPECIAL DEALS - WELLNESS COLLECTION ----------
  {
    name: "Digital Eye Massager Glasses – EMS + Red Light Therapy",
    url: "https://alphabooststore.com/products/digital-eye-massager-glasses",
    price: 26.95,
    category: "wellness",
    material: "lightweight frame with EMS technology",
    description: "EMS muscle stimulation + red light therapy for dark circles, eye strain relief & anti-aging",
    benefits: ["reduces dark circles", "relieves digital eye strain", "anti-aging effects", "hands-free design"],
    usage: "10 minutes daily, 4 modes x 3 intensity levels",
    triggers: ["eye strain", "tired eyes", "computer work", "screen time", "digital fatigue", "dark circles", "puffy eyes", "eye massage", "anti-aging", "wrinkles", "fine lines", "ems", "red light", "spa treatment", "eye care", "digital detox"]
  },
  {
    name: "Essential Oils Starter Kit - 6 Premium Aromatherapy Oils",
    url: "https://alphabooststore.com/products/essential-oils-starter-kit",
    price: 22.95,
    category: "aromatherapy",
    material: "6 x 10ml pure essential oils",
    description: "French Lavender, Peppermint, Sweet Orange, Tea Tree, Rosemary, Lemon Grass",
    benefits: ["stress relief", "better sleep", "energy boost", "natural healing", "home spa"],
    usage: "2-3 drops in diffuser, 1-2 drops on aromatherapy jewelry",
    triggers: ["essential oils", "aromatherapy", "stress relief", "relaxation", "sleep", "lavender", "peppermint", "natural", "wellness", "starter kit", "beginner", "diffuser oils", "calm", "anxiety", "peace", "meditation", "home spa", "scents"]
  },
  {
    name: "Heart Locket Aromatherapy Necklace - Essential Oil Diffuser",
    url: "https://alphabooststore.com/products/heart-locket-aromatherapy-necklace",
    price: 14.95,
    category: "aromatherapy",
    material: "alloy with electroplated finish",
    description: "Heart-shaped locket opens to hold essential oil felt pads for on-the-go aromatherapy",
    benefits: ["portable stress relief", "romantic design", "daily wellness", "anxiety relief"],
    usage: "Add 1-2 drops essential oil to felt pad, wear throughout day",
    triggers: ["aromatherapy jewelry", "heart locket", "stress relief", "anxiety", "essential oil necklace", "romantic gift", "daily wellness", "portable aromatherapy", "love", "heart", "locket", "anniversary", "valentine", "girlfriend"]
  },
  {
    name: "Smart Digital Thermal Bottle - Temperature Display (450ml)",
    url: "https://alphabooststore.com/products/smart-digital-thermal-bottle-temperature-display-coffee-mug-450ml",
    price: 16.95,
    category: "wellness",
    material: "stainless steel with digital display",
    description: "450ml thermal bottle with LED temperature display, keeps hot drinks 12h, cold 24h",
    benefits: ["perfect temperature display", "long insulation", "USB rechargeable", "office essential"],
    usage: "Fill with beverage, check temperature on LED display, USB charge weekly",
    triggers: ["smart bottle", "temperature display", "thermal bottle", "coffee mug", "office", "hot drinks", "cold drinks", "insulated", "digital", "USB", "work", "professional", "hydration", "coffee", "tea", "smart mug", "intelligent"]
  },
  {
    name: "Portable Heating Belt - Menstrual Cramps & Period Pain Relief",
    url: "https://alphabooststore.com/products/portable-heating-belt-menstrual-cramps-period-pain-relief-women",
    price: 26.95,
    category: "wellness",
    material: "heating pad with adjustable belt",
    description: "USB rechargeable heating belt for menstrual pain, back pain, muscle tension relief",
    benefits: ["menstrual pain relief", "portable heating", "hands-free", "adjustable temperature"],
    usage: "Wrap around waist, select heat level, use 15-30 minutes as needed",
    triggers: ["period pain", "menstrual cramps", "heating pad", "back pain", "muscle pain", "cramps", "period relief", "women's health", "heating belt", "pain relief", "monthly pain", "muscle tension", "usb heating", "portable heating", "period"]
  },
  {
    name: "Tree of Life Aromatherapy Diffuser Bracelet",
    url: "https://alphabooststore.com/products/tree-of-life-aromatherapy-bracelet",
    price: 12.95,
    category: "aromatherapy",
    material: "metal with anti-fatigue properties",
    description: "Wellness energy bracelet with essential oil diffusion, includes random color felt pad",
    benefits: ["energy boost", "anti-fatigue", "portable aromatherapy", "daily wellness"],
    usage: "Add essential oil to felt pad, insert in bracelet, wear daily",
    triggers: ["aromatherapy bracelet", "tree of life", "energy bracelet", "anti-fatigue", "wellness jewelry", "essential oil bracelet", "daily wellness", "wrist aromatherapy", "energy", "fatigue", "bracelet", "tree", "life", "spiritual"]
  },
  {
    name: "TikTok Viral EVA Cloud Slippers - Thick Sole Comfort",
    url: "https://alphabooststore.com/products/tiktok-viral-eva-cloud-slippers-thick-sole-comfort-slides-unisex",
    price: 19.95,
    category: "comfort",
    material: "EVA foam thick sole",
    description: "Ultra-comfortable slippers with cloud-like cushioning, waterproof, perfect for home and outdoor",
    benefits: ["maximum comfort", "cloud-like feeling", "waterproof", "easy to clean", "versatile use"],
    usage: "Wear at home, beach, or casual outings for ultimate comfort",
    triggers: ["cloud slippers", "comfort slippers", "tiktok viral", "eva slippers", "thick sole", "comfortable", "home slippers", "beach slippers", "waterproof", "cushioning", "soft", "cozy", "feet comfort", "walking on clouds", "viral", "tiktok"]
  },
  {
    name: "Face Ice Roller - Cooling Anti-Puffiness Beauty Tool",
    url: "https://alphabooststore.com/products/face-ice-roller-cooling-anti-puffiness-beauty-tool-for-morning-skincare",
    price: 14.95,
    category: "beauty",
    material: "plastic handle with cooling roller head",
    description: "Cooling face roller for reducing puffiness, tightening skin, and morning refreshment",
    benefits: ["reduces puffiness", "skin tightening", "cooling relief", "morning routine", "migraine relief"],
    usage: "Chill in freezer 15 minutes, roll on face in upward motions for 5-10 minutes",
    triggers: ["face roller", "ice roller", "puffiness", "morning routine", "skincare", "cooling", "beauty tool", "skin tightening", "facial massage", "anti-puffiness", "beauty", "face", "roller", "cooling tool", "migraine", "glow"]
  },
  {
    name: "Gold Collagen Eye Patches - Anti-Aging Hydrogel Under Eye Mask",
    url: "https://alphabooststore.com/products/gold-collagen-eye-patches",
    price: 14.95,
    category: "beauty",
    material: "hydrogel with gold collagen",
    description: "Luxurious under-eye patches with gold and collagen for anti-aging and hydration",
    benefits: ["anti-aging", "reduces dark circles", "hydrating", "luxury skincare", "collagen boost"],
    usage: "Apply under eyes for 20-30 minutes, use 2-3 times per week",
    triggers: ["eye patches", "collagen", "gold", "anti-aging", "under eye", "dark circles", "skincare", "luxury", "hydrating", "eye mask", "beauty", "premium", "hydrogel", "gold collagen", "luxury skincare"]
  },
  {
    name: "Aromatherapy Necklace - Essential Oil Pendant for Stress Relief",
    url: "https://alphabooststore.com/products/aromatherapy-necklace-essential-oil-pendant",
    price: 14.95,
    category: "aromatherapy",
    material: "minimalist stainless steel",
    description: "Geometric pendant opens to hold essential oil pads, minimalist design for daily wellness",
    benefits: ["minimalist design", "professional look", "daily stress relief", "hypoallergenic"],
    usage: "Add essential oil to felt pad, wear for continuous aromatherapy benefits",
    triggers: ["aromatherapy necklace", "minimalist jewelry", "essential oil pendant", "geometric design", "stress relief", "professional", "daily wellness", "stainless steel", "modern", "simple", "clean", "pendant", "minimalist", "geometric"]
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
  
  // NEW WELLNESS TRIGGERS
  stress: [
    "Stress is just energy that needs redirecting — let's channel it into wellness! 🌿",
    "Take a deep breath and let wellness be your superpower. ✨",
  ],
  tired: [
    "Tired eyes, tired soul — time for some digital detox and self-care! 👀",
    "Your body is telling you to slow down and recharge. Listen to it. 💆‍♀️",
  ],
  pain: [
    "Pain is temporary, but relief can be instant with the right tools. 🔥",
    "Don't let discomfort control your day — take charge of your wellness! 💪",
  ],
  period: [
    "Your period doesn't have to pause your life — take control with smart solutions! 🌸",
    "Monthly discomfort? Time to upgrade your self-care game! 💪",
  ],
  self_care: [
    "Self-care isn't selfish — it's essential. You deserve to feel amazing! ✨",
    "Invest in yourself today, future you will thank you. 🌟",
  ],
  beauty: [
    "True beauty starts with how you care for yourself daily. 💎",
    "Glow from within with the right wellness routine! ✨",
  ],
  comfort: [
    "Comfort is not a luxury — it's a necessity for peak performance! ☁️",
    "Your feet carry you through life — treat them like royalty! 👑",
  ],
  work: [
    "Work smart, stay hydrated, and keep your energy optimized! ⚡",
    "Professional performance starts with the right tools! 💼",
  ]
};

/* =======================================
   PRIORITY RULES (intent-based boosts)
======================================= */
const PRIORITY_RULES = [
  // Summer / hot weather
  {
    keywords: [
      "hot weather", "hot", "heat", "summer", "quick dry", "quick-dry", "fast dry", 
      "cool", "breathable", "sweat", "lightweight",
    ],
    boostFor: [
      "alphafit hyperdry training tee", "alphafit ice cotton tee",
      "alphafit icesilk performance tee", "alphafit iceskin pro tee",
    ],
    boostScore: 5,
  },
  // Gift / romantic
  {
    keywords: [
      "gift", "present", "wife", "husband", "girlfriend", "boyfriend", 
      "anniversary", "valentine", "romantic", "partner", "marriage", "couple", 
      "love", "special occasion", "angel", "blessing",
    ],
    boostFor: [
      "god knew i needed an angel tee", "god knew i needed hope tee",
      "hope – hold on pain ends tee", "heart locket aromatherapy necklace - essential oil diffuser",
    ],
    boostScore: 5,
  },
  // Motivation / warrior
  {
    keywords: [
      "warrior", "fighter", "battle", "win", "never give up", "strength", 
      "focus", "goal", "discipline", "motivation", "overcome", "mindset", "alpha motivation",
    ],
    boostFor: [
      "you vs you – conquer your inner battles tee", "be unstoppable lion tee",
      "the triad of change transformation tee", "i am the storm tee",
      "discipline over motivation tee", "my only competition is me tee", "no fear no limits tee",
    ],
    boostScore: 5,
  },
  
  // NEW WELLNESS RULES
  {
    keywords: [
      "eye strain", "tired eyes", "computer work", "screen time", "digital fatigue",
      "dark circles", "puffy eyes", "eye massage", "anti-aging", "wrinkles", "ems", "red light"
    ],
    boostFor: ["digital eye massager glasses – ems + red light therapy"],
    boostScore: 5,
  },
  {
    keywords: [
      "period pain", "menstrual cramps", "cramps", "period", "monthly pain", 
      "heating pad", "back pain", "muscle pain", "women's health", "pain relief"
    ],
    boostFor: ["portable heating belt - menstrual cramps & period pain relief"],
    boostScore: 5,
  },
  {
    keywords: [
      "stress relief", "aromatherapy", "essential oils", "relaxation", "anxiety",
      "wellness", "natural", "sleep", "lavender", "calm", "peace", "meditation"
    ],
    boostFor: [
      "essential oils starter kit - 6 premium aromatherapy oils",
      "heart locket aromatherapy necklace - essential oil diffuser",
      "aromatherapy necklace - essential oil pendant for stress relief",
      "tree of life aromatherapy diffuser bracelet"
    ],
    boostScore: 5,
  },
  {
    keywords: [
      "comfort", "slippers", "cloud", "comfortable", "home", "tiktok", "viral",
      "cushioning", "feet", "cozy", "thick sole", "eva", "walking", "soft"
    ],
    boostFor: ["tiktok viral eva cloud slippers - thick sole comfort"],
    boostScore: 5,
  },
  {
    keywords: [
      "skincare", "beauty", "face", "puffiness", "morning routine", "cooling",
      "facial", "skin tightening", "ice roller", "anti-puffiness", "glow"
    ],
    boostFor: [
      "face ice roller - cooling anti-puffiness beauty tool",
      "gold collagen eye patches - anti-aging hydrogel under eye mask"
    ],
    boostScore: 5,
  },
  {
    keywords: [
      "coffee", "tea", "hot drinks", "cold drinks", "office", "work", "thermal",
      "temperature", "smart bottle", "insulated", "digital", "mug", "hydration"
    ],
    boostFor: ["smart digital thermal bottle - temperature display (450ml)"],
    boostScore: 5,
  },
  {
    keywords: [
      "collagen", "eye patches", "anti-aging", "under eye", "gold", "luxury",
      "hydrating", "skincare", "dark circles", "eye mask", "premium beauty"
    ],
    boostFor: ["gold collagen eye patches - anti-aging hydrogel under eye mask"],
    boostScore: 5,
  },
  {
    keywords: [
      "jewelry", "necklace", "pendant", "heart locket", "minimalist", "geometric",
      "essential oil jewelry", "wearable aromatherapy", "daily wellness", "bracelet"
    ],
    boostFor: [
      "heart locket aromatherapy necklace - essential oil diffuser",
      "aromatherapy necklace - essential oil pendant for stress relief",
      "tree of life aromatherapy diffuser bracelet"
    ],
    boostScore: 5,
  }
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
      context += `Recommend this product: ${product.name} - ${product.url} - Price: $${product.price}\n`;
      if (product.material) context += `Material: ${product.material}\n`;
      if (product.sizes && product.sizes.length > 0) context += `Sizes: ${product.sizes.join(", ")}\n`;
      if (product.description) context += `Description: ${product.description}\n`;
      if (product.benefits) context += `Benefits: ${product.benefits.join(", ")}\n`;
      if (product.usage) context += `Usage: ${product.usage}\n`;
    }
    if (triggerReply) {
      context += `Use this motivational line: "${triggerReply}"\n`;
    }

    const systemPrompt = `
You are Alpha Oracle for AlphaBoostStore - the cosmic wellness and fitness guide.
Reply ULTRA-CONCISE (max 2 sentences). Be motivating, helpful, and subtly sales-driven.
If product info is provided, include it naturally with benefits and price.
If no specific product match, point to our collections with free US shipping and $5.99 worldwide: ${SHOP_URL}
For wellness products, focus on self-care benefits. For fitness, focus on performance.
Tone: motivating, confident, cosmic wisdom.
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
      completion.choices?.[0]?.message?.content?.trim() || "The cosmos awaits your next move. 🚀";

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
  console.log(`🚀 Alpha Oracle listening on port ${PORT}`);
  console.log(`📦 Loaded ${PRODUCTS.length} products`);
  console.log(`🎯 Ready to help customers with fitness and wellness!`);
});
