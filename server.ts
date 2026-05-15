import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || !key.startsWith("sk_")) {
      throw new Error("STRIPE_SECRET_KEY is missing or invalid. Please check Settings > Environment Variables.");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

app.use(express.json());

// API Routes - Stripe
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const stripe = getStripe();
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId || !priceId.startsWith("price_")) {
      return res.status(400).json({ error: "Invalid Price ID configuration." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ id: session.id });
  } catch (error: any) {
    const isConfigError = error.message.includes("STRIPE_SECRET_KEY") || 
                         error.type === 'StripeAuthenticationError' || 
                         (error.message && error.message.includes("Invalid API Key"));

    if (isConfigError) {
      console.warn("Stripe Configuration Warning:", error.message);
      return res.status(401).json({ 
        error: "Stripe API Key is invalid or not configured correctly.",
        code: 'STRIPE_AUTH_ERROR'
      });
    }

    console.error("Stripe Session Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Gemini Proxy
app.post("/api/gemini", async (req, res) => {
  const { action, payload } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured in the environment." });
  }

  try {
    let result;
    switch (action) {
      case 'generateDailySession':
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Generate ${payload.count || 5} different 'Words of the Day' for someone improving their spoken English. 
          Focus on practical, high-impact words (Intermediate level).
          For EACH word, also generate a multiple-choice fill-in-the-blank quiz question in a clear, relatable scenario.
          Return an array of objects.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  phonetic: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  example: { type: Type.STRING },
                  synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                  context: { type: Type.STRING },
                  quiz: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correctAnswer: { type: Type.STRING },
                      explanation: { type: Type.STRING }
                    },
                    required: ["question", "options", "correctAnswer", "explanation"]
                  }
                },
                required: ["word", "phonetic", "definition", "example", "synonyms", "context", "quiz"]
              }
            }
          }
        });
        break;

      case 'analyzePractice':
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analyze this spoken English practice attempt for the vocabulary word: "${payload.targetWord}".
          User's spoken text: "${payload.text}"
          ${payload.mission ? `Target Context (Mission): "${payload.mission}"` : "General practice session."}
     
          Evaluate the following:
          1. Contextual Precision: Did they use the word "${payload.targetWord}" in a way that makes sense?
          2. Grammatical Integrity: Is the surrounding sentence structure correct?
          3. Conversational Flow: Does it sound natural or forced?
          4. Mission Alignment: ${payload.mission ? `How well did they follow the specific mission prompt/context of "${payload.mission}"?` : "Evaluate general usage."}
          5. Phonetic Performance: Identify specific segments or phonemes in "${payload.targetWord}" that the user might have struggled with based on the transcript.
     
          Provide a professional yet encouraging analysis.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                clarity: { type: Type.NUMBER },
                accuracy: { type: Type.NUMBER },
                corrected: { type: Type.STRING },
                feedback: { type: Type.STRING },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                phoneticAnalysis: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      phoneme: { type: Type.STRING },
                      accuracy: { type: Type.NUMBER },
                      tip: { type: Type.STRING },
                      mouthPosition: { type: Type.STRING }
                    },
                    required: ["phoneme", "accuracy", "tip"]
                  }
                }
              },
              required: ["clarity", "accuracy", "corrected", "feedback", "suggestions", "phoneticAnalysis"]
            }
          }
        });
        break;

      case 'generateQuiz':
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Generate a multiple-choice fill-in-the-blank quiz question for the word "${payload.word}". 
          The question should be in a clear, relatable everyday or office scenario (Intermediate level). 
          Ensure the options are distinct but plausible.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswer", "explanation"]
            }
          }
        });
        break;

      case 'correctSentence':
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Act as a helpful English tutor. Correct the following sentence to sound more natural, professional, and grammatically correct.
          User sentence: "${payload.text}"
          Provide:
          1. The corrected version.
          2. A brief explanation of what was changed and why.
          3. A "natural tip" for how a native speaker might phrase it even more informally.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                explanation: { type: Type.STRING },
                naturalTip: { type: Type.STRING }
              },
              required: ["original", "corrected", "explanation", "naturalTip"]
            }
          }
        });
        break;

      case 'analyzeFreeSpeech':
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analyze this spoken English sentence: "${payload.text}"
          Evaluate if it is grammatically correct and sounds natural to a native speaker.
          Provide a score for naturalness (0-100).
          If it's incorrect or awkward, provide the "corrected" version.
          Provide constructive "feedback" and "tips" for improvement.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isCorrect: { type: Type.BOOLEAN },
                corrected: { type: Type.STRING },
                feedback: { type: Type.STRING },
                naturalness: { type: Type.NUMBER },
                tips: { type: Type.STRING }
              },
              required: ["isCorrect", "corrected", "feedback", "naturalness", "tips"]
            }
          }
        });
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    res.json(JSON.parse(result.response.text()));
  } catch (error: any) {
    console.error("Gemini AI error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // In production (non-Vercel environment), serve static files from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
