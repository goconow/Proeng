import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, RotateCcw, Send, CheckCircle2, AlertCircle, Volume2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzePractice } from '../lib/gemini';
import { PracticeFeedback } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface PracticeSessionProps {
  targetWord: string;
  isPro?: boolean;
  onUpgrade?: () => void;
  onPracticeComplete?: () => void;
}

export default function PracticeSession({ targetWord, isPro = false, onUpgrade, onPracticeComplete }: PracticeSessionProps) {
  const { user } = useAuth();
  const missions = [
    { id: 'free', label: 'Free Style', icon: '✨', prompt: 'Use the word in any sentence.' },
    { id: 'office', label: 'Office Talk', icon: '💼', prompt: `Use "${targetWord}" in a professional meeting or email response context.` },
    { id: 'story', label: 'Storyteller', icon: '📖', prompt: `Incorporate "${targetWord}" into a brief story about something that happened today.` },
    { id: 'social', label: 'Coffee Shop', icon: '☕', prompt: `Use "${targetWord}" in a casual chat with a friend.` },
  ];

  const [activeMission, setActiveMission] = useState(missions[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSoundDetected, setIsSoundDetected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [practiceCount, setPracticeCount] = useState(0);
  
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const FREE_LIMIT = 3;
  const isLimitReached = !isPro && practiceCount >= FREE_LIMIT;
  
  const recognitionRef = useRef<any>(null);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorStatus("Your browser does not support Speech Recognition. Please use Chrome or Safari.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setErrorStatus(null);
    };

    recognition.onsoundstart = () => setIsSoundDetected(true);
    recognition.onsoundend = () => setIsSoundDetected(false);

    recognition.onresult = (event: any) => {
      // Reset silence timer on speech activity
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.error('Auto-stop error:', e);
          }
        }
      }, 3000);

      const rawFinalSegments: string[] = [];
      let currentInterim = '';

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcriptSegment = result[0].transcript;
        
        if (result.isFinal) {
          rawFinalSegments.push(transcriptSegment.trim());
        } else {
          currentInterim += transcriptSegment;
        }
      }

      // Deduplicate overlapping segments (fixes common browser/platform repetition bugs)
      const finalSegments: string[] = [];
      rawFinalSegments.forEach(seg => {
        if (finalSegments.length === 0) {
          finalSegments.push(seg);
        } else {
          const prev = finalSegments[finalSegments.length - 1].toLowerCase();
          const curr = seg.toLowerCase();
          
          if (curr.startsWith(prev)) {
            finalSegments[finalSegments.length - 1] = seg;
          } else if (!prev.includes(curr)) {
            finalSegments.push(seg);
          }
        }
      });

      const finalJoined = finalSegments.join(' ');
      setTranscript(finalJoined);
      
      // Clean up interim to avoid showing text that was just finalized
      let cleanedInterim = currentInterim;
      if (finalJoined && currentInterim) {
        const lastFinalPart = finalSegments[finalSegments.length - 1].toLowerCase();
        const interimLower = currentInterim.toLowerCase();
        
        if (interimLower.startsWith(lastFinalPart)) {
          cleanedInterim = currentInterim.slice(lastFinalPart.length).trim();
        }
      }
      
      setInterimTranscript(cleanedInterim);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setIsSoundDetected(false);
      
      const errorMap: Record<string, string> = {
        'not-allowed': 'Microphone access denied. If you\'re using the Android app, please ensure RECORD_AUDIO permissions are in your AndroidManifest.xml and granted in your phone\'s app settings.',
        'no-speech': 'No speech detected. Try speaking a bit louder.',
        'network': 'Network error. Recognition requires an active internet connection.',
        'aborted': 'Recognition was interrupted.',
        'audio-capture': 'No microphone found. Please connect a mic.',
      };

      setErrorStatus(errorMap[event.error] || `Error: ${event.error}`);
      console.error('Speech Recognition Error:', event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsSoundDetected(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    return recognition;
  }, []);

  useEffect(() => {
    recognitionRef.current = initRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [initRecognition]);

  const toggleRecording = async () => {
    if (isLimitReached) {
      onUpgrade?.();
      return;
    }

    if (isRecording) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.error('Stop error:', err);
      }
      setIsRecording(false);
      setInterimTranscript('');
    } else {
      setTranscript('');
      setInterimTranscript('');
      setFeedback(null);
      setErrorStatus(null);
      
      try {
        // Cancel any ongoing speech synthesis to avoid hardware conflicts
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        // We'll trust the SpeechRecognition engine to handle permissions.
        // If it's already initialized, just start.
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e: any) {
             // In case of InvalidStateError (already started), the handler will set setIsRecording
             if (e.name !== 'InvalidStateError') {
               throw e;
             }
             setIsRecording(true);
          }
        } else {
          const rec = initRecognition();
          if (rec) {
            recognitionRef.current = rec;
            rec.start();
          }
        }
      } catch (e: any) {
        console.error('Speech start error:', e);
        setIsRecording(false);
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError' || e.message?.includes('denied')) {
          setErrorStatus("Microphone access denied. Please ensure you've allowed microphone access in your browser or app settings.");
        } else {
          setErrorStatus(`Microphone error: ${e.message || 'Could not start recognition'}. Please check your device settings.`);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!transcript) return;
    setIsAnalyzing(true);
    setErrorStatus(null);
    setFeedback(null);
    try {
      const result = await analyzePractice(transcript, targetWord, activeMission.prompt);
      setFeedback(result);
      setPracticeCount(prev => prev + 1);
      onPracticeComplete?.();

      // Save to Firestore if user is logged in
      if (user) {
        const path = `users/${user.uid}/practice_history`;
        try {
          await addDoc(collection(db, path), {
            userId: user.uid,
            word: targetWord,
            transcript: transcript,
            corrected: result.corrected,
            clarity: result.clarity,
            accuracy: result.accuracy,
            feedback: result.feedback,
            suggestions: result.suggestions,
            phoneticAnalysis: result.phoneticAnalysis,
            mission: activeMission.label,
            createdAt: serverTimestamp()
          });
        } catch (dbError) {
          handleFirestoreError(dbError, OperationType.CREATE, path);
        }
      }
    } catch (error: any) {
      console.error('Failed to analyze', error);
      setErrorStatus(error.message || 'An unexpected error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setTranscript('');
    setInterimTranscript('');
    setFeedback(null);
  };

  const speakFeedback = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 pb-24">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-black mb-2">Practice Sanctuary</h3>
        <p className="text-white/40 text-sm">Use the word in a sentence and get AI feedback.</p>
        
        {/* Mission Selector */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {missions.map((mission, idx) => (
            <button
              key={`mission-${mission.id}-${idx}`}
              onClick={() => {
                setActiveMission(mission);
                reset();
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeMission.id === mission.id 
                  ? 'bg-brand-primary text-black border-brand-primary' 
                  : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="mr-2">{mission.icon}</span>
              {mission.label}
            </button>
          ))}
        </div>

        {!isPro && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(practiceCount / FREE_LIMIT) * 100}%` }}
                 className="h-full bg-brand-primary"
               />
            </div>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
              {practiceCount} / {FREE_LIMIT} Free Attempts
            </span>
          </div>
        )}
      </div>

      <div className="glass p-8 rounded-3xl relative overflow-hidden">
        {/* Mission Briefing Overlay */}
        <div className="mb-6 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Current Mission:</span>
             <span className="text-[10px] font-bold text-white/60">{activeMission.label}</span>
          </div>
          <p className="text-xs text-white/80 italic serif-italic">"{activeMission.prompt}"</p>
        </div>
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div 
              key="analyzing-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-6"
            >
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={`loading-dot-${i}`}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-3 h-3 bg-brand-primary rounded-full"
                  />
                ))}
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-primary">Synthesizing Feedback</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errorStatus && (
            <motion.div 
              key="error-status"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-red-200/80 leading-relaxed">{errorStatus}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-6 min-h-[140px] bg-black/20 rounded-2xl p-6 border border-white/5 font-mono text-sm leading-relaxed relative flex flex-col">
          <div className="flex-1">
            {transcript || interimTranscript ? (
              <>
                <span className="text-white/90">{transcript}</span>
                {interimTranscript && (
                  <span className="text-brand-primary/50 italic ml-1">{interimTranscript}</span>
                )}
              </>
            ) : (
              <span className="text-white/20 italic">Your speech will appear here...</span>
            )}
          </div>
          
          <AnimatePresence>
            {isRecording && (
              <motion.div 
                key="recording-status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-end gap-1 h-8 mt-4"
              >
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`sound-bar-${i}`}
                    animate={{
                      height: isSoundDetected ? [4, Math.random() * 24 + 4, 4] : 4,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                    className="w-1 bg-brand-primary/40 rounded-full"
                  />
                ))}
                <span className="ml-4 text-[10px] uppercase font-bold text-brand-primary animate-pulse">
                  {isSoundDetected ? 'Sound Detected' : 'Listening...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center items-center gap-6">
          <div className="relative">
            <AnimatePresence>
              {isRecording && (
                <motion.div 
                  key="recording-pulse"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-red-500 rounded-full z-0"
                />
              )}
            </AnimatePresence>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleRecording}
              className={`relative z-10 p-6 rounded-full transition-all flex items-center justify-center ${
                isLimitReached
                  ? 'bg-white/5 border border-white/10 opacity-50 cursor-not-allowed'
                  : isRecording 
                    ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' 
                    : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {isLimitReached ? <Mic size={28} className="text-white/20" /> : isRecording ? <MicOff size={28} /> : <Mic size={28} />}
            </motion.button>
          </div>

          <AnimatePresence>
            {isLimitReached && (
              <motion.div
                key="limit-reached-warning"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute right-8 top-1/2 -translate-y-1/2 max-w-[180px]"
              >
                <div className="glass p-4 rounded-2xl border border-brand-primary/30 text-center">
                  <p className="text-[10px] font-bold text-white/60 mb-2 uppercase tracking-tighter leading-tight">Daily limit reached for free users.</p>
                  <button 
                    onClick={onUpgrade}
                    className="w-full py-2 bg-brand-primary rounded-lg text-black text-[9px] font-black uppercase tracking-widest"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {transcript && !isRecording && (
              <motion.div 
                key="practice-actions"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex gap-4"
              >
                <button 
                  onClick={reset}
                  className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={20} className="text-white/50" />
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-8 py-4 bg-brand-primary rounded-full font-bold text-sm tracking-widest uppercase hover:bg-brand-secondary transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Submit Practice'}
                  <Send size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              key="practice-feedback"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 pt-8 border-t border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Voice Speed</span>
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <span className="text-[10px] text-white/30">0.5x</span>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.1" 
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                    />
                    <span className="text-[10px] text-white/30">1.5x</span>
                    <span className="text-xs font-mono text-brand-primary ml-1 w-8">{speechRate}x</span>
                  </div>
                </div>
                <button 
                  onClick={() => speakFeedback(feedback.feedback)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-all border border-white/10"
                >
                  <Volume2 size={16} className="text-brand-primary" />
                  Listen to Feedback
                </button>
              </div>

              {feedback.phoneticAnalysis && feedback.phoneticAnalysis.length > 0 && (
                <div className="mb-8 space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-black text-white/40 tracking-[0.2em] uppercase">Vocal Biometrics</h4>
                    <span className="text-[10px] text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded-md border border-brand-primary/20">Advanced Feedback</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {feedback.phoneticAnalysis.map((detail, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={`phonetic-${idx}`} 
                        className="bg-black/40 p-5 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-brand-primary/30 transition-all"
                      >
                        {/* Simulated Waveform Visual for each phoneme */}
                        <div className="absolute top-0 right-0 flex items-end gap-0.5 h-12 px-4 pointer-events-none opacity-20">
                          {[...Array(8)].map((_, i) => (
                            <div 
                              key={i} 
                              className="w-1 bg-brand-primary rounded-full transition-all duration-500" 
                              style={{ 
                                height: `${Math.random() * (detail.accuracy / 2) + 10}%`,
                              }} 
                            />
                          ))}
                        </div>

                        <div className="flex justify-between items-start relative z-10 mb-4">
                          <div className="flex flex-col">
                            <span className="text-3xl font-black text-white mb-0.5">{detail.phoneme}</span>
                            <span className="text-[9px] font-black uppercase text-brand-primary tracking-[0.2em]">Syllabic Segment</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-black ${detail.accuracy > 80 ? 'text-green-400' : 'text-brand-primary'}`}>{detail.accuracy}%</span>
                            <div className="w-20 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${detail.accuracy}%` }}
                                className={`h-full ${detail.accuracy > 80 ? 'bg-green-400' : 'bg-brand-primary'}`} 
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 relative z-10">
                          <div className="flex gap-2">
                             <div className="w-1 bg-brand-primary/40 rounded-full" />
                             <p className="text-xs text-white/80 font-medium leading-relaxed italic">"{detail.tip}"</p>
                          </div>
                          
                          {detail.mouthPosition && (
                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Sparkles size={10} className="text-brand-primary" />
                                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest leading-none">Mouth Positioning</span>
                              </div>
                              <p className="text-[10px] text-white/50 leading-relaxed font-bold italic">
                                {detail.mouthPosition}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Simulated Intonation Curve */}
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Prosody & Rhythm Guide</span>
                    </div>
                    <div className="relative h-12 flex items-center justify-center">
                       <svg className="w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 20">
                          <motion.path
                            d="M0 10 Q 25 2, 50 10 T 100 10"
                            fill="none"
                            stroke="var(--brand-primary)"
                            strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                       </svg>
                       <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/20 uppercase tracking-[0.5em]">Stress Pattern Detected</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-white/40">
                    <span>Clarity</span>
                    <span className={feedback.clarity > 70 ? 'text-green-400' : 'text-brand-primary'}>{feedback.clarity}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${feedback.clarity}%` }}
                      className="h-full bg-brand-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-white/40">
                    <span>Word Accuracy</span>
                    <span className={feedback.accuracy > 70 ? 'text-green-400' : 'text-brand-primary'}>{feedback.accuracy}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${feedback.accuracy}%` }}
                      className="h-full bg-brand-secondary"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {feedback.corrected !== transcript && (
                  <div className="bg-brand-primary/10 p-5 rounded-2xl border border-brand-primary/20 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                       <Sparkles size={14} className="text-brand-primary" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Recommended Sentence</span>
                    </div>
                    <p className="text-lg font-bold text-white leading-relaxed italic">
                      "{feedback.corrected}"
                    </p>
                    <button 
                      onClick={() => speakFeedback(feedback.corrected)}
                      className="mt-2 text-[10px] text-brand-primary hover:underline flex items-center gap-1 font-bold uppercase tracking-widest"
                    >
                      Listen to native phrasing <Volume2 size={12} />
                    </button>
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="mt-1">
                    <CheckCircle2 className="text-green-400" size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white/90 mb-1">Feedback</h4>
                    <p className="text-sm text-white/60 leading-relaxed italic serif-italic text-lg">{feedback.feedback}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-white/40 tracking-[0.2em] uppercase px-1">Refinement Path</h4>
                  <ul className="space-y-3">
                    {feedback.suggestions.map((s, i) => (
                      <li key={`suggestion-${i}`} className="text-xs text-white/60 bg-white/5 p-4 rounded-xl border border-white/5 flex gap-3 leading-relaxed">
                        <span className="text-brand-primary font-bold">{i + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
