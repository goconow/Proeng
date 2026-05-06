import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, Wand2, Lightbulb, CheckCircle2, MessageSquareText, Mic, MicOff, AlertCircle, RotateCcw } from 'lucide-react';
import { analyzeFreeSpeech } from '../lib/gemini';

export default function CorrectionLab() {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ 
    isCorrect: boolean; 
    corrected: string; 
    feedback: string; 
    naturalness: number; 
    tips: string 
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  const initRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please check your browser settings.');
      }
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    initRecognition();
  }, [initRecognition]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const handleAnalyze = async () => {
    const textToAnalyze = input.trim();
    if (!textToAnalyze) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeFreeSpeech(textToAnalyze);
      setResult(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'The AI tutor is busy. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setInput('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-24 mb-32 px-4" id="free-speech-lab">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4">
          <Wand2 size={14} className="text-brand-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Free Speech Lab</span>
        </div>
        <h3 className="text-3xl font-black mb-2">Speak Your Mind</h3>
        <p className="text-white/40 text-sm italic serif-italic">Say anything you want. We'll listen, correct, and guide you.</p>
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-3xl">
        <div className="relative mb-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or click the mic to speak anything..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-brand-primary/50 transition-all min-h-[120px] resize-none"
          />
          
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleRecording}
              className={`p-3 rounded-xl transition-all ${
                isRecording 
                  ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                  : 'bg-white/5 hover:bg-white/10 text-white/40'
              }`}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAnalyze}
              disabled={isAnalyzing || !input.trim()}
              className={`p-3 rounded-xl transition-all ${
                isAnalyzing ? 'bg-white/10 cursor-not-allowed' : 'bg-brand-primary text-black hover:bg-white'
              }`}
            >
              {isAnalyzing ? (
                <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </motion.button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="lab-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-red-400 text-xs mb-4"
            >
              <AlertCircle size={12} />
              {error}
            </motion.div>
          )}

          {result && (
            <motion.div
              key="lab-result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 pt-6 border-t border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} className={result.isCorrect ? "text-green-400" : "text-brand-primary"} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      {result.isCorrect ? "Spot On" : "Refined Concept"}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-white leading-relaxed">
                    "{result.corrected || input}"
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-black tracking-widest text-white/20 mb-1">Naturalness</div>
                  <div className="text-2xl font-black text-brand-primary">{result.naturalness}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquareText size={14} className="text-brand-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Analysis</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed italic">
                    {result.feedback}
                  </p>
                </div>
                
                <div className="bg-brand-primary/5 p-5 rounded-2xl border border-brand-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={14} className="text-brand-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Tips & Tricks</span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed italic serif-italic">
                    {result.tips}
                  </p>
                </div>
              </div>

              <button 
                onClick={reset}
                className="group w-full py-4 text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                Speak Another Thought
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
