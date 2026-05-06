import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Info, Crown, X, AlertTriangle } from 'lucide-react';
import { AD_CONFIG } from '../constants/ads';

interface AdBannerProps {
  isPro: boolean;
  type?: 'banner' | 'rectangle' | 'sidebar';
}

export default function AdBanner({ isPro, type = 'banner' }: AdBannerProps) {
  const [adState, setAdState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // If user is Pro, don't render ads at all
  if (isPro) return null;

  useEffect(() => {
    const pushAd = () => {
      try {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle) {
          // Check if there are any uninitialized ad blocks currently in the DOM
          const uninitializedAds = document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
          if (uninitializedAds.length > 0) {
            adsbygoogle.push({});
            setAdState('loaded');
          }
        } else {
          // If adsbygoogle is not defined, script likely blocked or failed
          setAdState('error');
        }
      } catch (e) {
        console.warn('AdSense integration:', e);
        setAdState('error');
      }
    };

    const timer = setTimeout(pushAd, 500);
    return () => clearTimeout(timer);
  }, []);

  const styles = {
    banner: "w-full h-24 md:h-32 mb-8",
    rectangle: "w-full aspect-video mb-6",
    sidebar: "w-full aspect-square mt-auto mb-4"
  };

  const slotId = AD_CONFIG.slots[type] || AD_CONFIG.slots.banner;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${styles[type]} relative group`}
    >
      <div className="absolute inset-0 glass border border-white/5 rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center">
        {/* AdSense / AdMob for Web Tag */}
        <ins className="adsbygoogle"
             style={{ display: 'block', width: '100%', height: '100%', opacity: adState === 'loaded' ? 1 : 0 }}
             data-ad-client={AD_CONFIG.publisherId}
             data-ad-slot={slotId}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>

        {/* Fallback/Placement Guide */}
        {adState !== 'loaded' && (
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
            
            {AD_CONFIG.testMode && adState === 'error' && (
              <p className="text-[7px] text-white/10 mt-2 max-w-[80%]">
                Test ads may not load in preview or with adblockers active.
              </p>
            )}
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

  if (isPro) return null;

  useEffect(() => {
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
  }, []);

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

        <div className="w-full aspect-video rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden mb-6 relative">
          <ins className="adsbygoogle"
               style={{ display: 'block', width: '100%', height: '100%', opacity: adState === 'loaded' ? 1 : 0 }}
               data-ad-client={AD_CONFIG.publisherId}
               data-ad-slot={AD_CONFIG.slots.rectangle}
               data-ad-format="rectangle"
               data-full-width-responsive="true"></ins>
          
          {adState !== 'loaded' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {adState === 'loading' && <div className="w-8 h-8 border-2 border-white/10 border-t-brand-primary rounded-full animate-spin mb-4" />}
              {adState === 'error' && <AlertTriangle size={32} className="text-white/10 mb-4" />}
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                {adState === 'error' ? 'Ad Space Blocked' : 'Loading Sponsor Content...'}
              </p>
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
