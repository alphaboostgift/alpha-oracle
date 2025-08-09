const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🛍️ ALPHA BOOST PRODUCT DATABASE
const PRODUCTS = {
  fitness: {
    name: "AlphaFit Classic Tee",
    url: "https://alphabooststore.com/products/alphafit-classic-tee",
    triggers: ["fitness", "workout", "strength", "gym", "muscle", "exercise", "athletic", "health"]
  },
  transformation: {
    name: "The Triad of Change - Empowering Transformation Tee", 
    url: "https://alphabooststore.com/products/the-triad-of-change-empowering-transformation-tee",
    triggers: ["change", "transform", "life", "growth", "evolve", "better", "improve"]
  },
  warrior: {
    name: "Warrior Rise Again - Mindset Tee",
    url: "https://alphabooststore.com/products/warrior-rise-again-mindset-tee", 
    triggers: ["warrior", "fight", "overcome", "rise", "battle", "conquer"]
  },
  balance: {
    name: "Balance Mind Heart Harmony Tee",
    url: "https://alphabooststore.com/products/balance-mind-heart-harmony-tee",
    triggers: ["balance", "harmony", "peace", "mind", "calm", "zen"]
  },
  angel: {
    name: "God Knew I Needed An Angel - Comfort Tee",
    url: "https://alphabooststore.com/products/god-knew-i-needed-an-angel-unisex-comfort-t-shirt-gift-for-husband-wife",
    triggers: ["angel", "love", "blessed", "gift", "faith", "spiritual"]
  },
  performance: {
    name: "AlphaFit™ IceSkin Pro Tee - Feather Light",
    url: "https://alphabooststore.com/products/alphafit%E2%84%A2-iceskin-pro-tee-feather-light-breathable-athletic-cut",
    triggers: ["performance", "athletic", "sports", "training", "breathable"]
  },
  confidence: {
    name: "AlphaFit™ Sculpted Tee - Muscle Fit", 
    url: "https://alphabooststore.com/products/alphafit%E2%84%A2-sculpted-tee-short-sleeve-muscle-fit",
    triggers: ["confidence", "sculpted", "muscle", "fit", "physique"]
  }
};

const COLLECTION_URL = "https://alphabooststore.com/collections/alphafit-collection";
const SHIPPING_INFO = "🚚 Delivery: Free in USA | $5.99 worldwide";

// 🧠 Function to find matching product
function findMatchingProduct(message) {
  const messageLower = message.toLowerCase();
  for (const product of Object.values(PRODUCTS)) {
    if (product.triggers.some(trigger => messageLower.includes(trigger))) {
      return product;
    }
  }
  return null;
}

// 🧙‍♂️ MAIN ENDPOINT
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const matchedProduct = findMatchingProduct(message);

    let systemPrompt = `You are Alpha Oracle — a short, powerful motivational guide in an online store.
RULES:
- Answer in max 3 short sentences.
- Always give 1 motivational line + 1 suggestion to view a product or the AlphaFit Collection.
- Mention: "${SHIPPING_INFO}" at the end.
- If a specific product matches, suggest it, else suggest the AlphaFit Collection: ${COLLECTION_URL}.
Keep it friendly, confident, and inspiring.`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 80
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error('❌ OpenAI error:', err);
    res.status(500).json({ error: 'Alpha Oracle is temporarily unavailable.' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('🔥 Alpha Oracle is live!');
});

app.listen(3000, () => {
  console.log('✅ Running on http://localhost:3000');
});
