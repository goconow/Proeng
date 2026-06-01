import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Info, Crown, X, AlertTriangle, Sparkles } from 'lucide-react';
import { AD_CONFIG } from '../constants/ads';

interface AdBannerProps {
  isPro: boolean;
  type?: 'banner' | 'rectangle' | 'sidebar';
}

// 4 distinct interactive sponsor test ads geared for professional devs and linguists
const MOCK_ADS = [
  {
    id: 'google-vertex',
    title: 'Google Vertex AI',
    tagline: 'Build next-gen agentic applications with Gemini 3.5 models. Get $300 in free trial credits today.',
    highlight: 'Next-Gen AI',
    cta: 'Try Now',
    bg: 'from-blue-600/10 to-indigo-600/10 border-indigo-500/20',
    btnBg: 'bg-indigo-500 text-white hover:bg-indigo-600 text-[9px]',
    logo: '☁️',
    url: 'https://cloud.google.com/vertex-ai'
  },
  {
    id: 'jetbrains-mono',
    title: 'JetBrains Mono',
    tagline: 'An open-source typeface designed specially for developers. Easy on the eyes, beautiful in execution.',
    highlight: 'Dev Font',
    cta: 'Download',
    bg: 'from-orange-600/10 to-pink-600/10 border-orange-500/20',
    btnBg: 'bg-orange-500 text-white hover:bg-orange-600 text-[9px]',
    logo: '⌨️',
    url: 'https://www.jetbrains.com/lp/mono/'
  },
  {
    id: 'proeng-pro',
    title: 'Proeng Premium',
    tagline: 'Unlock endless speech calibrations, precise intonation models, and turn off all advertisements forever.',
    highlight: 'Going Pro',
    cta: 'Upgrade',
    bg: 'from-brand-primary/10 to-amber-500/10 border-brand-primary/20',
    btnBg: 'bg-brand-primary text-black hover:bg-white text-[9px]',
    logo: '👑',
    url: '#upgrade'
  },
  {
    id: 'framer-motion',
    title: 'Framer Motion',
    tagline: 'Deploy premium fluid visual entry transitions and spring-physics vectors inside React apps seamlessly.',
    highlight: 'React UI',
    cta: 'View Docs',
    bg: 'from-purple-600/10 to-fuchsia-600/10 border-purple-500/20',
    btnBg: 'bg-purple-500 text-white hover:bg-purple-600 text-[9px]',
    logo: '🍿',
    url: 'https://www.framer.com/motion/'
  }
];

export default function AdBanner({ isPro, type = 'banner' }: AdBannerProps) {
  const [adState, setAdState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    // Pick a random sponsor content on mount
    setAdIndex(Math.floor(Math.random() * MOCK_ADS.length));

    if (isPro) return;

    // If testMode is true, we skip the real adsbygoogle wait and load test ads instantly
    if (AD_CONFIG.testMode) {
      setAdState('loaded');
      return;
    }

    const pushAd = () => {
      try {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle) {
          const uninitializedAds = document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
          if (uninitializedAds.length > 0) {
            adsbygoogle.push({});
            setAdState('loaded');
          }
        } else {
          setAdState('error');
        }
      } catch (e) {
        console.warn('AdSense integration error:', e);
        setAdState('error');
      }
    };

    const timer = setTimeout(pushAd, 500);
    return () => clearTimeout(timer);
  }, [isPro]);

  if (isPro) return null;

  const styles = {
    banner: "w-full min-h-24 md:min-h-32 mb-8 relative",
    rectangle: "w-full aspect-video mb-6 relative",
    sidebar: "w-full aspect-square mt-auto mb-4 relative"
  };

  const slotId = AD_CONFIG.slots[type] || AD_CONFIG.slots.banner;
  const mockAd = MOCK_ADS[adIndex % MOCK_ADS.length];

  // If in testMode or failed real AdSense load, display our premium interactive developer sponsor ads
  const showFallbackTestAd = AD_CONFIG.testMode || adState === 'error';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${styles[type]} group`}
    >
      <div className="absolute inset-0 glass border border-white/5 rounded-3xl overflow-hidden">
        {/* Render real AdSense Tag only if not in TestMode and loads successfully */}
        {!showFallbackTestAd && (
          <ins className="adsbygoogle animate-fade-in"
               style={{ display: 'block', width: '100%', height: '100%', opacity: adState === 'loaded' ? 1 : 0 }}
               data-ad-client={AD_CONFIG.publisherId}
               data-ad-slot={slotId}
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        )}

        {/* Real Ad Loading/Error fallback indicators when NOT using TestMode fallback */}
        {!showFallbackTestAd && adState !== 'loaded' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/[0.02]">
            <div className="absolute top-2 right-3 flex items-center gap-1">
              <span className="text-[8px] font-black uppercase tracking-tighter text-white/20">
                {adState === 'error' ? 'Ads Blocked' : 'Advertisement'}
              </span>
              <Info size={10} className="text-white/20" />
            </div>
            {adState === 'loading' && (
              <div className="w-6 h-6 border-2 border-white/10 border-t-brand-primary rounded-full animate-spin mb-2" />
            )}
            {adState === 'error' && (
              <AlertTriangle size={16} className="text-white/10 mb-2" />
            )}
            <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">
              {adState === 'error' ? 'Ad Space Blocked' : 'Initializing Ad...'}
            </p>
          </div>
        )}

        {/* HIGH-FIDELITY INTERACTIVE SPONSOR TEST AD: Banner */}
        {showFallbackTestAd && type === 'banner' && (
          <div className={`w-full h-full p-4 md:p-6 flex items-center justify-between gap-4 transition-all bg-gradient-to-r ${mockAd.bg} border border-white/10 rounded-3xl`}>
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                {mockAd.logo}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-brand-primary">{mockAd.highlight}</span>
                  <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest border border-white/10 px-1.5 py-0.5 rounded bg-black/40">
                    TEST AD
                  </span>
                </div>
                <h4 className="text-sm font-extrabold italic text-white truncate">{mockAd.title}</h4>
                <p className="text-[11px] text-white/55 font-semibold leading-relaxed truncate max-w-[200px] sm:max-w-md lg:max-w-xl group-hover:text-white/70 transition-colors">
                  {mockAd.tagline}
                </p>
              </div>
            </div>
            
            <div className="shrink-0 flex items-center gap-4">
              <button
                onClick={() => {
                  if (mockAd.id === 'proeng-pro') {
                    window.dispatchEvent(new CustomEvent('open-pricing'));
                  } else {
                    window.open(mockAd.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`px-4 py-2 rounded-xl font-black uppercase tracking-widest transition-all ${mockAd.btnBg} flex items-center gap-1.5 shadow-lg active:scale-95`}
              >
                <span>{mockAd.cta}</span>
                <ExternalLink size={10} />
              </button>
            </div>
          </div>
        )}

        {/* HIGH-FIDELITY INTERACTIVE SPONSOR TEST AD: Rectangle */}
        {showFallbackTestAd && type === 'rectangle' && (
          <div className={`w-full h-full p-6 flex flex-col justify-between text-center transition-all bg-gradient-to-br ${mockAd.bg} border border-white/10 rounded-3xl`}>
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Sponsor Test Ad</span>
              <Info size={10} className="text-white/20" />
            </div>
            
            <div className="my-auto flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform mb-1">
                {mockAd.logo}
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary block mb-0.5">{mockAd.highlight}</span>
                <h4 className="text-base font-black italic serif-italic text-white">{mockAd.title}</h4>
                <p className="text-xs text-white/55 leading-relaxed font-semibold italic max-w-sm mt-1">
                  "{mockAd.tagline}"
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (mockAd.id === 'proeng-pro') {
                  window.dispatchEvent(new CustomEvent('open-pricing'));
                } else {
                  window.open(mockAd.url, '_blank', 'noopener,noreferrer');
                }
              }}
              className={`w-full max-w-xs mx-auto py-3 rounded-xl font-black uppercase tracking-widest transition-all ${mockAd.btnBg} flex items-center justify-center gap-1.5 shadow-lg active:scale-95`}
            >
              <span>{mockAd.cta}</span>
              <ExternalLink size={10} />
            </button>
          </div>
        )}

        {/* HIGH-FIDELITY INTERACTIVE SPONSOR TEST AD: Sidebar / Grid Block */}
        {showFallbackTestAd && type === 'sidebar' && (
          <div className={`w-full h-full p-5 flex flex-col justify-between transition-all bg-gradient-to-b ${mockAd.bg} border border-white/10 rounded-3xl`}>
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary">{mockAd.highlight}</span>
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest border border-white/10 px-1.5 py-0.5 rounded bg-black/40">
                TEST AD
              </span>
            </div>

            <div className="my-auto py-4 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:rotate-12 transition-transform">
                {mockAd.logo}
              </div>
              <h4 className="text-sm font-extrabold italic text-white leading-tight">{mockAd.title}</h4>
              <p className="text-[11px] text-white/50 leading-relaxed font-semibold italic">
                {mockAd.tagline}
              </p>
            </div>

            <button
              onClick={() => {
                if (mockAd.id === 'proeng-pro') {
                  window.dispatchEvent(new CustomEvent('open-pricing'));
                } else {
                  window.open(mockAd.url, '_blank', 'noopener,noreferrer');
                }
              }}
              className={`w-full py-3 rounded-xl font-black uppercase tracking-widest transition-all ${mockAd.btnBg} flex items-center justify-center gap-1.5 shadow-lg active:scale-95`}
            >
              <span>{mockAd.cta}</span>
              <ExternalLink size={10} />
            </button>
          </div>
        )}
      </div>
      
      {/* Remove Ads hint */}
      <div className="absolute -bottom-5 left-0 right-0 flex justify-center">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))}
          className="text-[8px] font-black text-white/10 hover:text-brand-primary transition-colors uppercase tracking-[0.2em]"
        >
          Remove Ads with Pro
        </button>
      </div>
    </motion.div>
  );
}

interface InterstitialProps {
  key?: string;
  isPro: boolean;
  onClose: () => void;
}

export function Interstitial({ isPro, onClose }: InterstitialProps) {
  const [adState, setAdState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    setAdIndex(Math.floor(Math.random() * MOCK_ADS.length));

    if (isPro) return;

    if (AD_CONFIG.testMode) {
      setAdState('loaded');
      return;
    }

    const pushAd = () => {
      try {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle) {
          const uninitializedAds = document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
          if (uninitializedAds.length > 0) {
            adsbygoogle.push({});
            setAdState('loaded');
          }
        } else {
          setAdState('error');
        }
      } catch (e) {
        setAdState('error');
      }
    };
    const timer = setTimeout(pushAd, 800);
    return () => clearTimeout(timer);
  }, [isPro]);

  if (isPro) return null;

  const mockAd = MOCK_ADS[adIndex % MOCK_ADS.length];
  const showFallbackTestAd = AD_CONFIG.testMode || adState === 'error';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
    >
      <div className="absolute top-8 right-8">
        <button 
          onClick={onClose}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all flex items-center gap-2 group"
        >
          <span className="text-[10px] font-black uppercase tracking-widest pl-2">Skip...</span>
          <X size={16} />
        </button>
      </div>

      <div className="w-full max-w-lg glass border border-white/10 rounded-[3rem] p-8 text-center relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 7, ease: "linear" }}
            onAnimationComplete={onClose}
            className="h-full bg-brand-primary"
          />
        </div>

        <div className="w-full aspect-video rounded-3xl bg-white/[0.03] border border-white/5 overflow-hidden mb-6 relative">
          {/* Render real AdSense Tag only if not in TestMode */}
          {!showFallbackTestAd && (
            <ins className="adsbygoogle"
                 style={{ display: 'block', width: '100%', height: '100%', opacity: adState === 'loaded' ? 1 : 0 }}
                 data-ad-client={AD_CONFIG.publisherId}
                 data-ad-slot={AD_CONFIG.slots.rectangle}
                 data-ad-format="rectangle"
                 data-full-width-responsive="true"></ins>
          )}
          
          {/* Fallback & Loading details */}
          {!showFallbackTestAd && adState !== 'loaded' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {adState === 'loading' && <div className="w-8 h-8 border-2 border-white/10 border-t-brand-primary rounded-full animate-spin mb-4" />}
              {adState === 'error' && <AlertTriangle size={32} className="text-white/10 mb-4" />}
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                {adState === 'error' ? 'Ad Space Blocked' : 'Loading Sponsor Content...'}
              </p>
            </div>
          )}

          {/* Premium Interstitial Simulated Test Ad */}
          {showFallbackTestAd && (
            <div className={`absolute inset-0 p-6 flex flex-col justify-between text-center transition-all bg-gradient-to-br ${mockAd.bg}`}>
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">TEST SPONSOR</span>
                <Info size={10} className="text-white/20" />
              </div>
              
              <div className="my-auto flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-1">
                  {mockAd.logo}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary block mb-0.5">{mockAd.highlight}</span>
                  <h4 className="text-base font-black italic serif-italic text-white">{mockAd.title}</h4>
                  <p className="text-xs text-white/50 leading-relaxed font-semibold italic max-w-sm mt-1 px-4">
                    "{mockAd.tagline}"
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (mockAd.id === 'proeng-pro') {
                    window.dispatchEvent(new CustomEvent('open-pricing'));
                    onClose();
                  } else {
                    window.open(mockAd.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`w-full max-w-xs mx-auto py-3 rounded-xl font-black uppercase tracking-widest transition-all ${mockAd.btnBg} flex items-center justify-center gap-1.5 shadow-lg active:scale-95`}
              >
                <span>{mockAd.cta}</span>
                <ExternalLink size={10} />
              </button>
            </div>
          )}
        </div>

        <h3 className="text-2xl font-black italic serif-italic mb-3 text-white">Unlock Full Potential</h3>
        <p className="text-white/40 text-xs mb-8 leading-relaxed max-w-[280px]">
          Upgrade to removing ads and unlock unlimited AI voice analysis.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('open-pricing'));
            }}
            className="w-full py-4 bg-brand-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl"
          >
            Upgrade to Pro
          </button>
          <button 
            onClick={onClose}
            className="text-[9px] font-black text-white/20 hover:text-white/40 uppercase tracking-widest py-2"
          >
            Continue with Ads
          </button>
        </div>
      </div>
    </motion.div>
  );
}
