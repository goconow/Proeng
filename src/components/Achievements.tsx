import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Shield, Zap, Target, BookOpen, X, ChevronRight } from 'lucide-react';
import { Achievement } from '../types';

interface AchievementsProps {
  key?: string;
  achievements: Achievement[];
  onClose: () => void;
}

export default function Achievements({ achievements, onClose }: AchievementsProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'trophy': return <Trophy className="text-yellow-400" size={24} />;
      case 'star': return <Star className="text-blue-400" size={24} />;
      case 'shield': return <Shield className="text-purple-400" size={24} />;
      case 'zap': return <Zap className="text-orange-400" size={24} />;
      case 'target': return <Target className="text-red-400" size={24} />;
      case 'book': return <BookOpen className="text-green-400" size={24} />;
      default: return <Star className="text-brand-primary" size={24} />;
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl glass border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-8 md:p-12 border-b border-white/5 bg-white/[0.02]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black italic serif-italic mb-2 text-white">Milestones</h2>
              <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Your journey to linguistic mastery</p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-white/40 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex items-center gap-4 bg-white/5 rounded-3xl p-6 border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20">
              <Trophy className="text-yellow-400" size={32} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{unlockedCount}</span>
                <span className="text-white/40 text-sm font-bold uppercase tracking-widest">/ {achievements.length} Unlocked</span>
              </div>
              <div className="w-48 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 transition-all duration-1000" 
                  style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-4 scroll-smooth">
          {achievements.map((achievement, idx) => (
            <div 
              key={`achievement-${achievement.id}-${idx}`}
              className={`group flex items-center gap-6 p-6 rounded-3xl border transition-all duration-300 ${
                achievement.unlocked 
                  ? 'bg-white/5 border-white/10 hover:border-brand-primary/30' 
                  : 'bg-black/20 border-white/5 opacity-60 grayscale'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                achievement.unlocked ? 'bg-white/5' : 'bg-white/2'
              }`}>
                {getIcon(achievement.icon)}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-bold ${achievement.unlocked ? 'text-white' : 'text-white/60'}`}>
                    {achievement.title}
                  </h3>
                  {achievement.unlocked && (
                    <span className="text-[8px] font-black uppercase tracking-widest bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                      MASTERED
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mb-3">{achievement.description}</p>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${achievement.unlocked ? 'bg-brand-primary' : 'bg-white/20'}`}
                      style={{ width: `${Math.min(100, (achievement.progress / achievement.requirement) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    {Math.min(achievement.requirement, achievement.progress)}/{achievement.requirement}
                  </span>
                </div>
              </div>
              
              <div className="hidden sm:block">
                <ChevronRight className="text-white/10 group-hover:text-white/20 transition-colors" size={20} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
