import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, HelpCircle, ArrowRight, BrainCircuit } from 'lucide-react';
import { QuizQuestion } from '../types';

interface DailyQuizProps {
  quiz: QuizQuestion;
}

export default function DailyQuiz({ quiz }: DailyQuizProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    const correct = option === quiz.correctAnswer;
    setIsCorrect(correct);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-24 mb-32">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4">
          <BrainCircuit size={14} className="text-brand-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Daily Cognition Test</span>
        </div>
        <h3 className="text-3xl font-black mb-2">Sharpen Your Wit</h3>
        <p className="text-white/40 text-sm italic serif-italic">Apply what you've learned in a real-world scenario.</p>
      </div>

      <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden border border-white/10 shadow-3xl">
        <div className="mb-8 relative z-10">
          <div className="flex items-start gap-4 mb-6">
            <HelpCircle className="text-brand-primary shrink-0 mt-1" size={24} />
            <p className="text-xl font-medium leading-relaxed text-white/90">
              {quiz.question.split('___').map((part, i, arr) => (
                <React.Fragment key={`part-${i}`}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="inline-block w-24 border-b-2 border-brand-primary/50 mx-2" />
                  )}
                </React.Fragment>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {quiz.options.map((option, index) => (
              <motion.button
                key={`${option}-${index}`}
                whileHover={!selectedOption ? { x: 10 } : {}}
                whileTap={!selectedOption ? { scale: 0.98 } : {}}
                onClick={() => handleOptionSelect(option)}
                disabled={!!selectedOption}
                className={`w-full p-5 rounded-2xl border text-left transition-all flex justify-between items-center ${
                  selectedOption === option
                    ? isCorrect
                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                      : 'bg-red-500/20 border-red-500/50 text-red-300'
                    : selectedOption && option === quiz.correctAnswer
                    ? 'border-green-500/50 text-green-300'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'
                }`}
              >
                <span className="font-medium">{option}</span>
                {selectedOption === option && (
                  isCorrect ? <Check size={20} /> : <X size={20} />
                )}
                {selectedOption && option === quiz.correctAnswer && !isCorrect && (
                   <Check size={20} className="opacity-50" />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {selectedOption && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-8 pt-8 border-t border-white/10 overflow-hidden"
            >
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Logic Breakdown</h4>
                <p className="text-sm text-white/70 leading-relaxed mb-4 italic">
                  {quiz.explanation}
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-primary hover:text-white transition-colors"
                >
                  Continue Journey <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop visual */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-primary/10 blur-[100px] pointer-events-none rounded-full" />
      </div>
    </div>
  );
}
