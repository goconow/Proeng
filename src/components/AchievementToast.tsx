import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, CheckCircle2 } from 'lucide-react';

interface AchievementToastProps {
  key?: string;
  title: string;
  onClose: () => void;
}

export default function AchievementToast({ title, onClose }: AchievementToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100, x: '-50%' }}
      animate={{ opacity: 1, y: -24, x: '-50%' }}
      exit={{ opacity: 0, y: 100, x: '-50%' }}
      className="fixed bottom-0 left-1/2 z-[200] w-full max-w-sm"
    >
      <div className="mx-4 p-4 glass border border-yellow-400/30 rounded-2xl shadow-[0_20px_50px_rgba(242,125,38,0.2)] flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20">
          <Trophy className="text-yellow-400" size={24} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Achievement Unlocked!</span>
            <CheckCircle2 className="text-green-500" size={12} />
          </div>
          <h4 className="text-sm font-bold text-white">{title}</h4>
        </div>
      </div>
    </motion.div>
  );
}
