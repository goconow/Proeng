import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { PracticeHistory as PracticeHistoryType } from '../types';
import { Calendar, Award, ChevronRight, Activity, Clock, Trash2, ArrowLeft } from 'lucide-react';

export default function PracticeHistory({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<PracticeHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      setLoading(true);
      const path = `users/${user.uid}/practice_history`;
      try {
        const q = query(
          collection(db, path),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const querySnapshot = await getDocs(q);
        const historyData: PracticeHistoryType[] = [];
        querySnapshot.forEach((doc) => {
          historyData.push({ id: doc.id, ...doc.data() } as PracticeHistoryType);
        });
        setHistory(historyData);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, path);
        setError("Failed to load your history. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 mx-4">
        <Activity size={48} className="text-brand-primary mb-6 animate-pulse" />
        <h2 className="text-2xl font-black mb-2">Login Required</h2>
        <p className="text-white/40 text-sm max-w-sm">Sign in to track your vocal journey and save your practice sessions.</p>
        <button 
          onClick={onBack}
          className="mt-8 flex items-center gap-2 px-8 py-4 bg-brand-primary rounded-full text-black font-black uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-brand-primary mb-4 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Dashboard</span>
          </button>
          <h2 className="text-4xl font-black mb-2">Vocal Records</h2>
          <p className="text-white/40 text-sm">A chronicle of your phonetic evolution.</p>
        </div>
        <div className="hidden md:flex gap-8">
            <div className="text-center">
                <span className="block text-2xl font-black text-brand-primary">{history.length}</span>
                <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Sessions</span>
            </div>
            <div className="text-center">
                <span className="block text-2xl font-black text-brand-secondary">
                    {history.length > 0 
                        ? Math.round(history.reduce((acc, curr) => acc + curr.clarity, 0) / history.length) 
                        : 0}%
                </span>
                <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Avg Clarity</span>
            </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">Retrieving Records</span>
        </div>
      ) : history.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center border-dashed">
            <Clock size={48} className="text-white/10 mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-2">The Silence is Deep</h3>
            <p className="text-white/40 text-sm max-w-xs mx-auto mb-8">You haven't recorded any sessions yet. Start your first practice to begin your journey.</p>
            <button 
                onClick={onBack}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-full text-white/60 font-bold text-xs uppercase tracking-widest transition-all"
            >
                Start Practicing
            </button>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {history.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group glass p-6 rounded-2xl hover:bg-white/10 transition-all border border-white/5 flex flex-col md:flex-row gap-6 md:items-center"
              >
                <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary shrink-0">
                        <Award size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-lg capitalize">{item.word}</h4>
                        <div className="flex items-center gap-2 text-white/30 text-[10px] font-bold uppercase tracking-tight">
                            <Calendar size={12} />
                            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    <p className="text-sm text-white/60 line-clamp-1 italic serif-italic">"{item.transcript}"</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded text-white/40">
                            {item.mission || 'Free Style'}
                        </span>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-primary" style={{ width: `${item.clarity}%` }} />
                            </div>
                            <span className="text-xs font-mono font-bold text-brand-primary">{item.clarity}%</span>
                        </div>
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Clarity Score</span>
                    </div>
                    <ChevronRight size={20} className="text-white/20 group-hover:text-brand-primary transition-colors" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
