import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

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

// API Routes
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
