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
    triggers: ["fitness", "workout", "strength", "gym", "muscle", "strong", "exercise", "athletic", "health"]
  },
  transformation: {
    name: "The Triad of Change - Empowering Transformation Tee", 
    url: "https://alphabooststore.com/products/the-triad-of-change-empowering-transformation-tee",
    triggers: ["change", "transform", "life", "new", "growth", "evolve", "different", "better", "improve"]
  },
  warrior: {
    name: "Warrior Rise Again - Mindset Tee",
    url: "https://alphabooststore.com/products/warrior-rise-again-mindset-tee", 
    triggers: ["warrior", "fight", "overcome", "rise", "strength", "never give up", "battle", "strong", "defeat", "conquer"]
  },
  balance: {
    name: "Balance Mind Heart Harmony Tee",
    url: "https://alphabooststore.com/products/balance-mind-heart-harmony-tee",
    triggers: ["balance", "harmony", "peace", "mind", "heart", "centered", "calm", "meditation", "zen", "equilibrium"]
  },
  angel: {
    name: "God Knew I Needed An Angel - Comfort Tee",
    url: "https://alphabooststore.com/products/god-knew-i-needed-an-angel-unisex-comfort-t-shirt-gift-for-husband-wife",
    triggers: ["angel", "love", "blessed", "grateful", "gift", "comfort", "faith", "divine", "spiritual", "thankful"]
  },
  performance: {
    name: "AlphaFit™ IceSkin Pro Tee - Feather Light",
    url: "https://alphabooststore.com/products/alphafit%E2%84%A2-iceskin-pro-tee-feather-light-breathable-athletic-cut",
    triggers: ["performance", "athletic", "sports", "training", "breathable", "comfort", "pro", "advanced", "elite"]
  },
  confidence: {
    name: "AlphaFit™ Sculpted Tee - Muscle Fit", 
    url: "https://alphabooststore.com/products/alphafit%E2%84%A2-sculpted-tee-short-sleeve-muscle-fit",
    triggers: ["confidence", "sculpted", "body", "muscle", "fit", "physique", "appearance", "self-image", "look good"]
  }
};

// 🧠 Function to find matching product based on user message
function findMatchingProduct(message) {
  const messageLower = message.toLowerCase();
  
  for (const [key, product] of Object.entries(PRODUCTS)) {
    const hasMatch = product.triggers.some(trigger => 
      messageLower.includes(trigger.toLowerCase())
    );
    if (hasMatch) {
      return product;
    }
  }
  return null;
}

console.log("⚠️ MongoDB is temporarily disabled.");

// 🧙‍♂️ MAIN ALPHA ORACLE ENDPOINT
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Find matching product for this user's message
    const matchedProduct = findMatchingProduct(message);
    
    // Create system prompt with product knowledge
    let systemPrompt = `You are Alpha Oracle - a wise, empathetic motivational assistant who helps people overcome challenges and unlock their inner strength.

PERSONALITY:
- Speak with wisdom and compassion
- Be encouraging but realistic
- Focus on solutions and growth
- Keep responses concise but impactful (max 150 words)
- Use a warm, understanding tone

GUIDELINES:
1. Provide genuine, helpful motivational advice FIRST
2. Address their specific challenge with actionable steps
3. Be solution-focused and encouraging`;

    // Add product recommendation if there's a match
    if (matchedProduct) {
      systemPrompt += `

PRODUCT RECOMMENDATION:
If it feels natural and helpful, you may mention: "${matchedProduct.name}" from AlphaBoostStore.com as a daily reminder of their strength and commitment.
Link: ${matchedProduct.url}

IMPORTANT: Only suggest the product if it emotionally aligns with your advice. The motivational guidance is primary - product mention is secondary and optional.`;
    }

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      model: "gpt-4o",
      temperature: 0.8,
      max_tokens: 200
    });

    const reply = completion.choices[0].message.content;
    
    // Log for debugging
    console.log(`🔮 Oracle responded to: "${message.substring(0, 50)}..."`);
    if (matchedProduct) {
      console.log(`💎 Matched product: ${matchedProduct.name}`);
    }

    res.json({ reply });
    
  } catch (err) {
    console.error('❌ OpenAI error:', err);
    res.status(500).json({ error: 'Alpha Oracle is temporarily unavailable. Please try again.' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('🔥 Alpha Oracle is alive and ready to help transform lives!');
});

app.listen(3000, () => {
  console.log('✅ Alpha Oracle running on http://localhost:3000');
  console.log(`💎 Product database loaded: ${Object.keys(PRODUCTS).length} items`);
});