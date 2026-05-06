import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Star, Shield, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

interface PricingProps {
  key?: string;
  isPro?: boolean;
  onUpgrade: () => void;
  onClose: () => void;
}

export default function Pricing({ isPro, onUpgrade, onClose }: PricingProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showSimulateConfirm, setShowSimulateConfirm] = useState(false);
  const [simulateReason, setSimulateReason] = useState<string | null>(null);

  const handleUpgrade = async () => {
    const pubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const priceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;

    // Gracefully handle missing configuration by offering simulation
    if (!pubKey || !pubKey.startsWith('pk_') || !priceId) {
      setSimulateReason("Stripe API keys are partially configured or missing. Complete setup in Settings > Environment Variables.");
      setShowSimulateConfirm(true);
      return;
    }

    setIsRedirecting(true);
    try {
      const stripe = await loadStripe(pubKey);
      if (!stripe) throw new Error("Stripe failed to load");

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: priceId as string,
          successUrl: `${window.location.origin}?payment=success`,
          cancelUrl: `${window.location.origin}?payment=cancelled`,
        }),
      });

      const session = await response.json();
      if (session.error) {
        if (session.code === 'STRIPE_AUTH_ERROR' || session.error.includes("Invalid API Key")) {
          throw new Error("STRIPE_CONFIG_ERROR");
        }
        throw new Error(session.error);
      }

      // Using any here as a fallback for potential type conflicts between backend/frontend Stripe packages
      const result = await (stripe as any).redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        alert(result.error.message);
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      
      const isConfigIssue = err.message === "STRIPE_CONFIG_ERROR" || err.message.includes("Invalid API Key");
      
      if (isConfigIssue) {
        setSimulateReason("The Stripe secret key (STRIPE_SECRET_KEY) appears to be invalid or missing server-side.");
        setShowSimulateConfirm(true);
      } else {
        alert("Payment Error: " + err.message);
      }
    } finally {
      setIsRedirecting(false);
    }
  };
  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for casual learners",
      features: [
        "1 Word of the Day",
        "3 AI Feedback sessions / day",
        "Basic Daily Quiz",
        "Community Support"
      ],
      cta: "Current Plan",
      featured: false,
      disabled: true
    },
    {
      name: "Pro",
      price: "$9.99",
      period: "/ month",
      description: "For serious fluency seekers",
      features: [
        "Unlimited AI Practice",
        "Advanced Phonetic Breakdown",
        "Priority Gemini-3 Analysis",
        "Personalized Progress Reports",
        "No usage limits",
        "Ad-free Experience"
      ],
      cta: isPro ? "Current Plan" : "Start 7-Day Free Trial",
      featured: true,
      disabled: isPro
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl glass rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl flex flex-col md:flex-row max-h-[90vh] overflow-y-auto scroll-smooth"
      >
        <AnimatePresence>
          {showSimulateConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mb-8 border border-brand-primary/20">
                <Shield size={40} className="text-brand-primary" />
              </div>
              <h3 className="text-2xl font-black mb-4">Configuration Required</h3>
              <p className="text-white/40 text-sm mb-8 leading-relaxed max-w-md">
                {simulateReason}
              </p>
              <div className="flex flex-col gap-4 w-full max-w-xs">
                <button 
                  onClick={() => onUpgrade()}
                  className="w-full py-4 bg-brand-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg"
                >
                  Simulate Success for Demo
                </button>
                <button 
                  onClick={() => setShowSimulateConfirm(false)}
                  className="w-full py-4 bg-white/5 text-white/40 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-white/20 mt-8 max-w-xs">
                In a production environment, this would redirect you to Stripe's secure payment portal.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Side: Benefits */}
        <div className="flex-1 p-12 bg-white/[0.02]">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-6">
              <Crown size={14} className="text-brand-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Elevate Your Speech</span>
            </div>
            <h2 className="text-4xl font-black mb-4 leading-tight">Master English<br />Without Limits.</h2>
            <p className="text-white/40 text-sm leading-relaxed">Join 10,000+ users who improved their professional confidence with Vocab Pro.</p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                <Zap size={20} className="text-brand-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold mb-1">Instant AI Feedback</h4>
                <p className="text-xs text-white/30 leading-relaxed">Sophisticated analysis of your accent and grammar in real-time.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                <Shield size={20} className="text-brand-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold mb-1">Privacy Guaranteed</h4>
                <p className="text-xs text-white/30 leading-relaxed">Secure data handling for professional learners.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Plans */}
        <div className="flex-1 p-8 grid grid-cols-1 gap-6 bg-black/40">
          {plans.map((plan, idx) => (
            <div 
              key={`plan-${plan.name}-${idx}`}
              className={`relative p-6 rounded-3xl border transition-all ${
                plan.featured 
                  ? 'bg-brand-primary/10 border-brand-primary/50 shadow-[0_0_40px_rgba(var(--brand-primary-rgb),0.1)]' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {plan.featured && (
                <div className="absolute top-4 right-6 px-3 py-1 bg-brand-primary rounded-full text-[8px] font-black uppercase tracking-widest text-black">
                  Recommended
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-black uppercase tracking-widest mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black">{plan.price}</span>
                  {plan.period && <span className="text-xs text-white/30">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={`${plan.name}-${idx}`} className="flex items-center gap-2 text-xs text-white/60">
                    <Check size={14} className="text-brand-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !plan.disabled && (plan.featured ? handleUpgrade() : onUpgrade())}
                disabled={plan.disabled || isRedirecting}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  plan.featured
                    ? 'bg-brand-primary text-black hover:bg-white'
                    : 'bg-white/10 text-white/60 cursor-default'
                } disabled:opacity-50`}
              >
                {isRedirecting && plan.featured ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Preparing Secure Checkout...
                  </>
                ) : (
                  <>
                    {plan.cta}
                    {plan.featured && <ArrowRight size={14} />}
                  </>
                )}
              </button>
            </div>
          ))}
          
          <p className="text-[10px] text-center text-white/20 mt-4">
            Cancel anytime. 7-day free trial applies to new users.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
