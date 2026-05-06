import { Vocabulary } from '../types';
import { Volume2, ChevronRight, BookOpen, Quote, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface WordCardProps {
  data: Vocabulary;
  onSpeak: (text: string) => void;
  isMastered?: boolean;
  onMaster?: () => void;
}

export default function WordCard({ data, onSpeak, isMastered, onMaster }: WordCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 md:p-8 rounded-3xl w-full max-w-2xl mx-auto shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <BookOpen size={120} />
      </div>

      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-widest text-brand-primary font-semibold block">
              Word of the Day
            </span>
            {isMastered && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[8px] font-black uppercase text-green-500 flex items-center gap-1">
                <CheckCircle2 size={10} /> Mastered
              </span>
            )}
          </div>
          <h2 className="text-4xl md:text-6xl font-black mb-1 flex items-center gap-4">
            {data.word}
          </h2>
          <span className="text-xl font-mono text-white/50">{data.phonetic}</span>
        </div>
        <div className="flex gap-2">
          {onMaster && (
            <button 
              onClick={onMaster}
              className={`p-4 rounded-full transition-all group border ${
                isMastered 
                  ? 'bg-green-500/20 border-green-500/30 text-green-500' 
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-green-500 hover:bg-green-500/10 hover:border-green-500/20'
              }`}
              title={isMastered ? "Mastered" : "Mark as Mastered"}
            >
              <CheckCircle2 />
            </button>
          )}
          <button 
            onClick={() => onSpeak(data.word)}
            className="p-4 rounded-full bg-white/5 hover:bg-brand-primary/20 transition-all group border border-white/10"
            title="Listen"
          >
            <Volume2 className="text-white group-hover:text-brand-primary transition-colors" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <p className="text-lg leading-relaxed text-white/80 italic serif-italic">
            "{data.definition}"
          </p>
        </section>

        <section className="bg-white/5 p-4 md:p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 mb-3 text-brand-primary">
            <Quote size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Example Usage</span>
          </div>
          <p className="text-md text-white/90 leading-snug">
            {data.example}
          </p>
          <button 
            onClick={() => onSpeak(data.example)}
            className="mt-3 text-xs text-brand-primary hover:underline flex items-center gap-1"
          >
            Hear example <ChevronRight size={12} />
          </button>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Synonyms</span>
            <div className="flex flex-wrap gap-2">
              {data.synonyms.map((s, i) => (
                <span key={`${s}-${i}`} className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/70 border border-white/10">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Context</span>
            <p className="text-[11px] text-white/60 leading-tight">
              {data.context}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
