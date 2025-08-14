// ===== Alpha Oracle - Enhanced with FREE Keyword Matching =====
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import OpenAI from "openai";
import fetch from "node-fetch"; // ако си на Node 18+, може да махнеш този импорт

/* ================== App & Config ================== */
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;               // https://alphabooststore.com
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* ================== MongoDB (Mongoose) ================== */
async function connectMongo(retry = 0) {
  if (!MONGODB_URI) {
    console.warn("⚠️ No MONGODB_URI provided");
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "alphaoracle",
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000
    });
    console.log("✅ MongoDB connected (mongoose)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err?.message || err);
    if (retry < 5) {
      const backoff = 2000 * (retry + 1);
      console.log(`↻ Retry Mongo in ${backoff}ms ...`);
      setTimeout(() => connectMongo(retry + 1), backoff);
    }
  }
}
await connectMongo();

/* ================== Schemas & Models ================== */
const chatLogSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now },
  sessionId: String,
  userMessage: String,
  botReply: String,
  productHandles: [String],
  triggers: [String],
  outcome: String // clicked | purchased | none
}, { collection: "chatlogs" });

const eventSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now },
  type: String,                 // click | purchase | feedback
  productHandle: String,
  sessionId: String,
  meta: Object
}, { collection: "events" });

const productSchema = new mongoose.Schema({
  id: Number,
  handle: { type: String, index: true },
  title: { type: String, index: "text" },
  body_html: String,
  tags: [String],
  updatedAt: Date
}, { collection: "products" });

// helpful index
productSchema.index({ title: "text", body_html: "text", tags: 1 });

const scoreSchema = new mongoose.Schema({
  trigger: { type: String, index: true },
  productHandle: { type: String, index: true },
  clicks: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 }
}, { collection: "scores" });

const ChatLog = mongoose.model("ChatLog", chatLogSchema);
const EventModel = mongoose.model("Event", eventSchema);
const Product = mongoose.model("Product", productSchema);
const Score = mongoose.model("Score", scoreSchema);

/* ================== FREE KEYWORD MATCHING SYSTEM ================== */
const STOPWORDS = new Set([
  "the","and","for","with","a","to","of","in","on","at","by","is","are","from",
  "your","you","our","this","that","these","those","it","as","be","or","an","we"
]);

function tokenize(raw = "") {
  return [...new Set(
    String(raw)
      .toLowerCase()
      .replace(/<[^>]*>/g, "")            // strip HTML
      .split(/[^a-z0-9]+/g)               // split non-alnum
      .filter(w => w && w.length > 2 && !STOPWORDS.has(w))
  )];
}

function generateKeywordsFromProduct(p) {
  const text = `${p?.title || ""} ${p?.body_html || ""} ${(p?.tags || []).join(" ")}`;
  return tokenize(text);
}

function extractUserKeywords(q) {
  return tokenize(q).slice(0, 10);        // максимум 10 ключови думи от потребителя
}

// Кеш в паметта (освежава се на ~5 минути)
let KW_CACHE = { products: [], ts: 0 };

async function loadProductsForKW() {
  const FRESH_FOR_MS = 5 * 60 * 1000;     // 5 мин.
  if (Date.now() - KW_CACHE.ts < FRESH_FOR_MS && KW_CACHE.products.length) {
    return KW_CACHE.products;
  }
  const products = await Product.find({}).lean();
  KW_CACHE = { products, ts: Date.now() };
  return products;
}

async function findProductsByKeywordsNoAI(userMsg, limit = 3) {
  const products = await loadProductsForKW();
  const userKW = extractUserKeywords(userMsg);

  const scored = products
    .map(p => {
      const pkw = generateKeywordsFromProduct(p);
      // броим съвпадения по принципа "съдържа/частично съвпадение"
      let score = 0;
      for (const u of userKW) {
        if (pkw.some(k => k.includes(u) || u.includes(k))) score++;
      }
      return { p, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => ({
      title: x.p.title,
      handle: x.p.handle,
      url: `${SHOPIFY_STORE}/products/${x.p.handle}`,
      tags: x.p.tags || [],
      score: x.score
    }));

  return scored;
}

/* ================== Original Utilities (Enhanced) ================== */
function extractKeywords(text) {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9+]+/i)
    .filter(w => w && w.length > 2)
    .slice(0, 12);
}

async function findProductsByKeywords(keywords) {
  if (!keywords?.length) return [];
  try {
    const items = await Product.find({
      $or: [
        { $text: { $search: keywords.join(" ") } },
        { tags: { $in: keywords } }
      ]
    }).limit(12);
    return items;
  } catch (e) {
    // ако текстовият индекс още не е създаден
    const regexes = keywords.map(k => new RegExp(`\\b${k}\\b`, "i"));
    return Product.find({
      $or: [
        { title: { $in: regexes } },
        { body_html: { $in: regexes } },
        { tags: { $in: keywords } }
      ]
    }).limit(12);
  }
}

async function rankByScores(trigger, products) {
  if (!products.length) return [];
  const handles = products.map(p => p.handle);
  const rows = await Score.find({ trigger, productHandle: { $in: handles } });
  const map = new Map(rows.map(r => [r.productHandle, r.clicks * 1 + r.purchases * 3]));
  return products.sort((a,b) => (map.get(b.handle)||0) - (map.get(a.handle)||0));
}

async function recommendProducts(userMessage) {
  // 1) Първо пробваме MongoDB text search
  const kws = extractKeywords(userMessage);
  const dbItems = await findProductsByKeywords(kws);
  
  if (dbItems?.length) {
    const ranked = await rankByScores(kws[0] || "general", dbItems);
    return ranked.slice(0, 3);
  }

  // 2) Fallback към безплатния keyword matcher
  console.log("💡 Using free keyword matching...");
  const kwResults = await findProductsByKeywordsNoAI(userMessage, 3);
  return kwResults;
}

async function bumpScore(trigger, productHandle, type) {
  const inc = type === "purchase" ? { purchases: 1 } : { clicks: 1 };
  await Score.updateOne({ trigger, productHandle }, { $inc: inc }, { upsert: true });
}

/* ================== Shopify Sync (cron + webhooks) ================== */
async function fetchShopifyProducts(pageInfo = null) {
  if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
    console.warn("⚠️ SHOPIFY_STORE or SHOPIFY_ADMIN_TOKEN missing – skipping sync.");
    return { products: [], nextPage: null };
  }

  const url = new URL(`${SHOPIFY_STORE}/admin/api/2024-07/products.json`);
  url.searchParams.set("limit", "250");
  if (pageInfo) url.searchParams.set("page_info", pageInfo);

  const resp = await fetch(url.toString(), {
    headers: { "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN }
  });
  if (!resp.ok) throw new Error(`Shopify ${resp.status}`);
  const data = await resp.json();
  const link = resp.headers.get("link");
  const next = link && /<([^>]+)>;\s*rel="next"/.exec(link)?.[1];
  return { products: data.products, nextPage: next ? new URL(next).searchParams.get("page_info") : null };
}

async function syncProductsFromShopify() {
  if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) return;
  console.log("↻ Sync products...");
  let page = null, total = 0;
  do {
    const { products, nextPage } = await fetchShopifyProducts(page);
    for (const p of products) {
      await Product.updateOne(
        { id: p.id },
        {
          $set: {
            id: p.id,
            handle: p.handle,
            title: p.title,
            body_html: p.body_html,
            tags: (p.tags || "").split(",").map(t => t.trim()).filter(Boolean),
            updatedAt: new Date(p.updated_at)
          }
        },
        { upsert: true }
      );
      total++;
    }
    page = nextPage;
  } while (page);
  console.log(`✅ Synced ${total} products`);
  
  // Clear cache to force refresh
  KW_CACHE = { products: [], ts: 0 };
}

// стартов синк + периодичен (на 60 мин)
syncProductsFromShopify();
setInterval(syncProductsFromShopify, 60 * 60 * 1000);

// Webhook: products/create & products/update
app.post("/webhooks/shopify/product", express.json({ type: "*/*" }), async (req, res) => {
  try {
    const p = req.body;
    if (!p?.id) return res.status(400).send("no product id");
    await Product.updateOne(
      { id: p.id },
      {
        $set: {
          id: p.id,
          handle: p.handle,
          title: p.title,
          body_html: p.body_html,
          tags: (p.tags || "").split(",").map(t => t.trim()).filter(Boolean),
          updatedAt: new Date(p.updated_at || Date.now())
        }
      },
      { upsert: true }
    );
    
    // Clear cache when new product added
    KW_CACHE = { products: [], ts: 0 };
    console.log(`📦 Product updated via webhook: ${p.title}`);
    
    res.status(200).send("ok");
  } catch (e) {
    console.error("Webhook error:", e);
    res.status(500).send("error");
  }
});

/* ================== Tracking Endpoints ================== */
app.post("/event/click", async (req, res) => {
  const { productHandle, sessionId, trigger } = req.body || {};
  try {
    await EventModel.create({ type: "click", productHandle, sessionId });
    await bumpScore(trigger || "general", productHandle, "click");
    res.json({ ok: true });
  } catch (e) {
    console.error("click event error:", e);
    res.status(500).json({ ok: false });
  }
});

app.post("/event/purchase", async (req, res) => {
  const { productHandle, sessionId, trigger, revenue } = req.body || {};
  try {
    await EventModel.create({ type: "purchase", productHandle, sessionId, meta: { revenue } });
    await bumpScore(trigger || "general", productHandle, "purchase");
    res.json({ ok: true });
  } catch (e) {
    console.error("purchase event error:", e);
    res.status(500).json({ ok: false });
  }
});

app.post("/feedback", async (req, res) => {
  const { sessionId, value } = req.body || {}; // 1 | -1
  try {
    await EventModel.create({ type: "feedback", sessionId, meta: { value } });
    res.json({ ok: true });
  } catch (e) {
    console.error("feedback error:", e);
    res.status(500).json({ ok: false });
  }
});

/* ================== Enhanced Chat Endpoint ================== */
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};
    if (!message) return res.status(400).json({ error: "message is required" });

    // 1) Enhanced product finding with fallback
    const products = await recommendProducts(message);
    
    // 2) Build context for OpenAI
    let context = "";
    if (products.length) {
      const productLines = products.map(p => `• ${p.title} – ${SHOPIFY_STORE}/products/${p.handle}`);
      context = `Available products:\n${productLines.join("\n")}\n`;
    }

    // 3) Improved system prompt
    const system = `You are Alpha Oracle for AlphaBoostStore - cosmic wellness and fitness guide.
Reply ULTRA-CONCISE (max 2 sentences). Be motivating, helpful, and subtly sales-driven.
${context ? 'ONLY recommend products from the available products list above.' : 'If no specific products match, guide users to https://alphabooststore.com/collections/special-deals'}
Tone: motivating, confident, cosmic wisdom.
${context}`.trim();

    const user = `User message: ${message}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      max_tokens: 180,
      temperature: 0.8
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Got it.";

    // 4) Enhanced logging
    await ChatLog.create({
      sessionId,
      userMessage: message,
      botReply: reply,
      productHandles: products.map(p => p.handle),
      triggers: extractUserKeywords(message)
    });

    res.json({
      reply,
      products: products.map(p => ({ 
        handle: p.handle, 
        title: p.title, 
        url: `${SHOPIFY_STORE}/products/${p.handle}`,
        matchScore: p.score || 0
      }))
    });
  } catch (e) {
    console.error("chat error:", e);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ================== Health & Debug Endpoints ================== */
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/health/db", async (_req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Debug endpoint to test keyword matching
app.get("/debug/keywords/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const keywords = extractUserKeywords(query);
    const matches = await findProductsByKeywordsNoAI(query, 5);
    res.json({ 
      query, 
      keywords, 
      matches: matches.map(m => ({ title: m.title, score: m.score }))
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/* ================== Start Server ================== */
app.listen(PORT, () => console.log(`✅ Alpha Oracle listening on port ${PORT}`));
