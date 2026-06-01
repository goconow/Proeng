import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, Mic, MicOff, RotateCcw, Send, CheckCircle2, AlertCircle, 
  Sparkles, Compass, Search, Award, RefreshCw, MessageSquare, BookMarked, BrainCircuit, Play
} from 'lucide-react';
import { generateContextualSentences, analyzeSentencePractice } from '../lib/gemini';
import { ContextualScenario, ContextualSentence, SentenceFeedback } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface SentencePracticeProps {
  isPro: boolean;
  onUpgrade: () => void;
}

const PREBUILT_SCENARIOS = [
  {
    id: 'office-pushback',
    title: 'Polite Office Pushback',
    description: 'Declining extra workload or unrealistic deadlines confidently and professionally.',
    category: 'Workplace',
    icon: '💼',
    prompt: 'Professional office environment where you politely decline extra tasks due to capacity limits.'
  },
  {
    id: 'salary-raise',
    title: 'Salary & Raise Negotiation',
    description: 'Bringing up compensation topics with your manager during performance evaluations.',
    category: 'Workplace',
    icon: '💰',
    prompt: 'Negotiating a salary adjustment with a supportive manager during a review session.'
  },
  {
    id: 'cafe-custom',
    title: 'Custom Coffee Ordering',
    description: 'Ordering standard or specific beverages at a fast-paced metropolitan cafe.',
    category: 'Social',
    icon: '☕',
    prompt: 'Ordering coffee with specific milk preferences and payment specifications.'
  },
  {
    id: 'flight-delay',
    title: 'Resolving Flight Delays',
    description: 'Asking airline staff for rebooking assistance, vouchers, or luggage claims.',
    category: 'Travel',
    icon: '✈️',
    prompt: 'Calmly and effectively asking a customer service agent for flight options during a heavy delay.'
  },
  {
    id: 'heart-apology',
    title: 'Deep Sincere Apology',
    description: 'Expressing detailed accountability and regrets to a colleague or close partner.',
    category: 'Relationship',
    icon: '🤝',
    prompt: 'Apologizing for a missed meeting or mistake, stating how you plan to make it right.'
  }
];

export default function SentencePractice({ isPro, onUpgrade }: SentencePracticeProps) {
  const { user } = useAuth();
  
  // Scenarios state
  const [activeScenario, setActiveScenario] = useState<ContextualScenario | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [customScenarioQuery, setCustomScenarioQuery] = useState('');
  
  // Practice interaction states
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSoundDetected, setIsSoundDetected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<SentenceFeedback | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(0.9);
  
  // Limit states
  const [sentencesPracticed, setSentencesPracticed] = useState(0);
  const FREE_LIMIT = 5;
  const isLimitReached = !isPro && sentencesPracticed >= FREE_LIMIT;
  
  // Bookmarked sentences stored in localStorage
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('proeng_sentence_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Speech Recognition
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
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.error('Auto-stop error:', e);
          }
        }
      }, 4000);

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
      
      let cleanedInterim = currentInterim;
      if (finalJoined && currentInterim) {
        const lastFinalPart = finalSegments[finalSegments.length - 1].toLowerCase();
        if (currentInterim.toLowerCase().startsWith(lastFinalPart)) {
          cleanedInterim = currentInterim.slice(lastFinalPart.length).trim();
        }
      }
      
      setInterimTranscript(cleanedInterim);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setIsSoundDetected(false);
      
      const errorMap: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please verify browser options.',
        'no-speech': 'No speech detected. Speak clearly into your mic.',
        'network': 'Network connection issue noticed.',
        'aborted': 'Voice capturing was interrupted.'
      };

      setErrorStatus(errorMap[event.error] || `Capturing Error: ${event.error}`);
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

  // Load a conversational scenario
  const handleSelectScenario = async (promptQuery: string) => {
    setLoadingScenario(true);
    setErrorStatus(null);
    setFeedback(null);
    setTranscript('');
    setInterimTranscript('');
    setSelectedSentenceIndex(0);
    
    try {
      const generated = await generateContextualSentences(promptQuery);
      setActiveScenario(generated);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to load sentences for this scenario. Please try again.");
    } finally {
      setLoadingScenario(false);
    }
  };

  const handleToggleBookmark = (sentence: string) => {
    setBookmarks(prev => {
      const updated = prev.includes(sentence) 
        ? prev.filter(s => s !== sentence) 
        : [...prev, sentence];
      localStorage.setItem('proeng_sentence_bookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  const triggerRecording = () => {
    if (isLimitReached) {
      onUpgrade();
      return;
    }

    if (isRecording) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setInterimTranscript('');
      setFeedback(null);
      setErrorStatus(null);
      
      try {
        window.speechSynthesis.cancel();
        if (recognitionRef.current) {
          recognitionRef.current.start();
        } else {
          const rec = initRecognition();
          if (rec) {
            recognitionRef.current = rec;
            rec.start();
          }
        }
      } catch (e: any) {
        console.error(e);
        setIsRecording(false);
        setErrorStatus("Microphone initialization failed. Please allow permissions.");
      }
    }
  };

  const handleSubmitPractice = async () => {
    if (!transcript || !activeScenario) return;
    setIsAnalyzing(true);
    setErrorStatus(null);
    setFeedback(null);
    
    const targetSentence = activeScenario.sentences[selectedSentenceIndex].text;
    
    try {
      const analysis = await analyzeSentencePractice(transcript, targetSentence);
      setFeedback(analysis);
      setSentencesPracticed(prev => prev + 1);
      
      // Save to Firestore history if logged in
      if (user) {
        try {
          await addDoc(collection(db, `users/${user.uid}/sentence_practice_history`), {
            userId: user.uid,
            scenarioName: activeScenario.scenarioName,
            targetSentence,
            transcript,
            naturalnessScore: analysis.naturalnessScore,
            fluencyScore: analysis.fluencyScore,
            soundAccuracy: analysis.soundAccuracy,
            feedback: analysis.feedback,
            nativeAlternative: analysis.nativeAlternative || '',
            tips: analysis.tips,
            createdAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.warn("Could not save attempt history:", dbErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Analysis failed. Please test again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const speakSentence = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    // Attempt standard EN voices
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
    if (enVoice) utterance.voice = enVoice;
    window.speechSynthesis.speak(utterance);
  };

  const clearPractice = () => {
    setTranscript('');
    setInterimTranscript('');
    setFeedback(null);
    setErrorStatus(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 pb-24 px-4 text-left">
      <div className="mb-12 text-center md:text-left">
        <h3 className="text-xs uppercase tracking-[0.4em] font-black text-white/20 mb-3">Contextual Training</h3>
        <h1 className="text-4xl font-extrabold italic serif-italic text-white flex items-center justify-center md:justify-start gap-3">
          Sentence Practice Lab <Compass className="text-brand-primary" size={28} />
        </h1>
        <p className="text-white/40 text-sm mt-3 leading-relaxed max-w-2xl font-medium">
          Saying words is great, but speaking natural, contextual phrases makes you fluent.
          Choose a scenario below, trigger a custom setting, or click the mic to begin calibrating your fluency, pacing, and stress patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Selection list */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary flex items-center gap-2">
              <BrainCircuit size={14} /> Choose a Scenario
            </h4>
            
            <div className="space-y-3">
              {PREBUILT_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc.prompt)}
                  disabled={loadingScenario}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    activeScenario?.scenarioName.includes(sc.title) || (activeScenario && sc.prompt.includes(activeScenario.scenarioName))
                      ? 'bg-brand-primary/10 border-brand-primary/40 shadow-[0_0_15px_rgba(242,125,38,0.1)]'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl">{sc.icon}</span>
                    <span className="text-xs font-black uppercase tracking-wider text-white/90">{sc.title}</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-semibold italic">{sc.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt generation card */}
          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-primary">
              <Sparkles size={14} /> Generate Custom Setting
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed font-semibold">
              Describe any situation (e.g., "apologizing to a customs officer" or "selling shoes at a mall") and Gemini will generate 3 realistic sentences to practice!
            </p>
            <div className="relative">
              <input
                type="text"
                value={customScenarioQuery}
                onChange={(e) => setCustomScenarioQuery(e.target.value)}
                placeholder="Type a unique situation..."
                className="w-full bg-black/40 border border-white/10 p-3 pr-10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-primary/50 transition-colors font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customScenarioQuery.trim()) {
                    handleSelectScenario(customScenarioQuery);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (customScenarioQuery.trim()) {
                    handleSelectScenario(customScenarioQuery);
                  }
                }}
                disabled={loadingScenario || !customScenarioQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-primary disabled:text-white/20 p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                title="Generate custom sentences"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Bookmarks saved locally panel */}
          {bookmarks.length > 0 && (
            <div className="glass p-6 rounded-3xl border border-white/5 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary flex items-center gap-2">
                <BookMarked size={14} /> Bookmarked Phrasing ({bookmarks.length})
              </h4>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {bookmarks.map((b, idx) => (
                  <div 
                    key={`bookmark-${idx}`} 
                    className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group gap-2"
                  >
                    <p className="text-xs text-white/80 italic font-semibold line-clamp-2">"{b}"</p>
                    <div className="flex gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => speakSentence(b)}
                        className="p-1 hover:bg-white/10 rounded text-brand-primary"
                        title="Pronounce"
                      >
                        <Volume2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleToggleBookmark(b)}
                        className="p-1 hover:bg-white/10 rounded text-red-400"
                        title="Remove"
                      >
                        <span className="text-[10px]">✕</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interaction Sandbox */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {loadingScenario ? (
              <motion.div
                key="loading-scenario"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass p-12 rounded-[32px] border border-white/5 flex flex-col items-center justify-center gap-4 text-center min-h-[400px]"
              >
                <RefreshCw className="text-brand-primary animate-spin" size={32} />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-white/90">Synthesizing Contextual Expressions</h4>
                  <p className="text-[11px] text-white/40 mt-1">Evaluating conversational structures and stress patterns...</p>
                </div>
              </motion.div>
            ) : !activeScenario ? (
              <motion.div
                key="initial-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-12 rounded-[32px] border border-white/5 flex flex-col items-center justify-center gap-6 text-center min-h-[400px]"
              >
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center">
                  <Compass className="text-brand-primary" size={32} />
                </div>
                <div>
                  <h4 className="text-lg font-black italic serif-italic text-white">Select a Practice Scenario to Begin</h4>
                  <p className="text-xs text-white/40 mt-2 max-w-sm mx-auto leading-relaxed">
                    Select one of our high-impact default office, travel, and lifestyle themes on the left, or input your own bespoke prompt!
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="interactive-sandbox"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Active scenario layout card */}
                <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
                  <div>
                    <span className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      Active Training Mode
                    </span>
                    <h2 className="text-2xl font-black italic serif-italic text-white mt-4">
                      "{activeScenario.scenarioName}"
                    </h2>
                    {activeScenario.description && (
                      <p className="text-xs text-white/40 mt-1 font-semibold">{activeScenario.description}</p>
                    )}
                  </div>

                  {/* Curated list of generated sentences */}
                  <div className="space-y-3">
                    {activeScenario.sentences.map((sentence, idx) => (
                      <button
                        key={`sentence-${idx}`}
                        className={`w-full p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all ${
                          selectedSentenceIndex === idx
                            ? 'bg-white/5 border-brand-primary/50'
                            : 'bg-black/30 border-white/5 hover:bg-white/5'
                        }`}
                        onClick={() => {
                          setSelectedSentenceIndex(idx);
                          clearPractice();
                        }}
                      >
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="text-sm font-bold text-white italic leading-relaxed">
                            "{sentence.text}"
                          </p>
                          <p className="text-xs font-mono text-white/40">
                            {sentence.phonetic}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrinks-0">
                          <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border ${
                            selectedSentenceIndex === idx 
                              ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/20' 
                              : 'bg-white/5 text-white/30 border-white/5'
                          }`}>
                            Phraseme {idx + 1}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Microphone interaction card */}
                <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6 relative overflow-hidden">
                  <AnimatePresence>
                    {isAnalyzing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/75 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4 text-center"
                      >
                        <div className="flex gap-2.5">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={`analyzing-dot-${i}`}
                              animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.3, 1, 0.3],
                              }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              className="w-3 h-3 bg-brand-primary rounded-full"
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-primary">
                          Evaluating Fluency & Naturalness
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active Selected sentence briefing & pronunciation guide */}
                  <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary flex items-center gap-1.5">
                        <MessageSquare size={12} /> Target Phraseme Guidance
                      </span>
                      <button 
                        onClick={() => handleToggleBookmark(activeScenario.sentences[selectedSentenceIndex].text)}
                        className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                          bookmarks.includes(activeScenario.sentences[selectedSentenceIndex].text)
                            ? 'text-brand-primary'
                            : 'text-white/40 hover:text-white'
                        }`}
                      >
                        <BookMarked size={12} /> 
                        {bookmarks.includes(activeScenario.sentences[selectedSentenceIndex].text) ? 'Bookmarked' : 'Save phrase'}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-lg font-extrabold italic text-white leading-relaxed">
                        "{activeScenario.sentences[selectedSentenceIndex].text}"
                      </p>
                      <p className="text-sm font-mono text-brand-primary font-medium">
                        Phonetics: {activeScenario.sentences[selectedSentenceIndex].phonetic}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/5 text-xs">
                      <div>
                        <span className="text-white/30 font-bold block mb-1 uppercase tracking-wide text-[9px]">Linguistic Context:</span>
                        <p className="text-white/70 italic font-semibold leading-relaxed">"{activeScenario.sentences[selectedSentenceIndex].whyNatural}"</p>
                      </div>
                      <div>
                        <span className="text-white/30 font-bold block mb-1 uppercase tracking-wide text-[9px]">Intonation Pattern:</span>
                        <p className="text-white/70 italic font-semibold leading-relaxed">"{activeScenario.sentences[selectedSentenceIndex].intonation}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Audio settings controller */}
                  <div className="flex flex-wrap gap-6 justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => speakSentence(activeScenario.sentences[selectedSentenceIndex].text)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-black hover:bg-white transition-all rounded-xl font-black text-[10px] tracking-widest uppercase shrink-0"
                      >
                        <Play size={12} fill="black" /> Pronounce Target
                      </button>
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold text-white/30">Ratio</span>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          value={speechRate}
                          onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                          className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                        />
                        <span className="text-xs font-mono text-brand-primary font-bold">{speechRate}x</span>
                      </div>
                    </div>

                    {!isPro && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand-primary" 
                            style={{ width: `${(sentencesPracticed / FREE_LIMIT) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                          {sentencesPracticed} / {FREE_LIMIT} Free Tries
                        </span>
                      </div>
                    )}
                  </div>

                  {errorStatus && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-xs text-red-200/80">
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                      <p className="leading-relaxed font-semibold">{errorStatus}</p>
                    </div>
                  )}

                  {/* Transcription viewer card */}
                  <div className="min-h-[140px] bg-black/40 border border-white/5 rounded-[24px] p-6 text-sm leading-relaxed flex flex-col justify-between font-mono">
                    <div className="flex-1">
                      {transcript || interimTranscript ? (
                        <>
                          <span className="text-white font-bold leading-relaxed">"{transcript}</span>
                          {interimTranscript && (
                            <span className="text-brand-primary/50 italic ml-1"> {interimTranscript}</span>
                          )}
                          <span className="text-white font-bold">"</span>
                        </>
                      ) : (
                        <span className="text-white/20 italic font-semibold">
                          Click the circle microphone below to begin recording...
                        </span>
                      )}
                    </div>

                    {isRecording && (
                      <div className="flex items-center gap-1.5 h-8 mt-4">
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={`voicebar-${i}`}
                            animate={{ height: isSoundDetected ? [4, Math.random() * 24 + 4, 4] : 4 }}
                            transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.04 }}
                            className="w-1 bg-brand-primary/50 rounded-full"
                          />
                        ))}
                        <span className="ml-4 text-[10px] uppercase font-bold text-brand-primary animate-pulse tracking-wider">
                          {isSoundDetected ? 'Capturing Voice Frequency' : 'Mic Capturing...'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active mic controls */}
                  <div className="flex justify-center items-center gap-4">
                    <div className="relative">
                      {isRecording && (
                        <motion.div
                          animate={{ scale: 1.6, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute inset-0 bg-red-500 rounded-full z-0"
                        />
                      )}
                      
                      <button
                        onClick={triggerRecording}
                        disabled={isLimitReached}
                        className={`relative z-10 p-6 rounded-full transition-all flex items-center justify-center ${
                          isLimitReached
                            ? 'bg-white/5 opacity-40 cursor-not-allowed'
                            : isRecording
                              ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                              : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {isRecording ? <MicOff size={26} /> : <Mic size={26} />}
                      </button>
                    </div>

                    {isLimitReached && (
                      <div className="glass p-3 rounded-2xl border border-brand-primary/30 max-w-[200px] text-center">
                        <p className="text-[10px] font-bold uppercase text-white/60 tracking-tight leading-tight">Daily trial threshold crossed.</p>
                        <button 
                          onClick={onUpgrade}
                          className="w-full mt-2 py-1.5 bg-brand-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest"
                        >
                          Unlock Unlimited
                        </button>
                      </div>
                    )}

                    {transcript && !isRecording && (
                      <div className="flex gap-3">
                        <button
                          onClick={clearPractice}
                          className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/50"
                          title="Reset"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button
                          onClick={handleSubmitPractice}
                          disabled={isAnalyzing}
                          className="flex items-center gap-2 px-6 py-4 bg-brand-primary text-black rounded-full font-black text-xs tracking-wider uppercase hover:bg-white transition-all"
                        >
                          Evaluate Phrasing <Send size={14} fill="currentColor" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Detailed Analysis Output */}
                  <AnimatePresence>
                    {feedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-8 pt-8 border-t border-white/10 space-y-8"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase">
                            AI Fluency Calibration Metrics
                          </h4>
                          <span className="text-[9px] font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-0.5 rounded">
                            Intermediate-Advanced Guide
                          </span>
                        </div>

                        {/* Scores indicators grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <ScoreMeter label="Naturalness" value={feedback.naturalnessScore} color="bg-brand-primary" stroke="stroke-brand-primary" />
                          <ScoreMeter label="Speech Pacing" value={feedback.fluencyScore} color="bg-brand-secondary" stroke="stroke-brand-secondary" />
                          <ScoreMeter label="Sound Accuracy" value={feedback.soundAccuracy} color="bg-green-400" stroke="stroke-green-400" />
                        </div>

                        {/* Native speaker tips & alignment */}
                        {feedback.nativeAlternative && feedback.nativeAlternative !== transcript && (
                          <div className="p-5 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl space-y-2">
                            <div className="flex items-center gap-1.5 text-brand-primary">
                              <Sparkles size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Acoustic Refinement Model</span>
                            </div>
                            <p className="text-base font-extrabold text-white leading-relaxed italic">
                              "{feedback.nativeAlternative}"
                            </p>
                            <button
                              onClick={() => speakSentence(feedback.nativeAlternative || '')}
                              className="text-[10px] font-bold tracking-widest uppercase text-brand-primary hover:underline flex items-center gap-1.5"
                            >
                              Pronounce native alternative <Volume2 size={12} />
                            </button>
                          </div>
                        )}

                        {/* Speech evaluation text */}
                        <div className="flex gap-4">
                          <div className="mt-0.5 text-green-400 shrink-0">
                            <CheckCircle2 size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase text-white/80 mb-1 tracking-wider">Expert Evaluator Feedback:</h4>
                            <p className="text-sm text-white/70 leading-relaxed italic font-semibold">
                              "{feedback.feedback}"
                            </p>
                          </div>
                        </div>

                        {/* Segment pronunciation lists */}
                        {feedback.phoneticAnalysis && feedback.phoneticAnalysis.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase">Segment Analysis</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {feedback.phoneticAnalysis.map((segData, index) => (
                                <div 
                                  key={`segment-${index}`}
                                  className="bg-black/20 border border-white/5 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between"
                                >
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <span className="text-sm font-extrabold text-white italic">"{segData.segment}"</span>
                                    <span className={`text-xs font-mono font-bold ${segData.score >= 80 ? 'text-green-400' : 'text-brand-primary'}`}>
                                      {segData.score}%
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-white/50 italic leading-relaxed font-semibold">"{segData.tip}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Stress waves mockup */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                          <div className="relative h-10 flex items-center justify-center overflow-hidden">
                            <svg className="w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 20">
                              <path d="M 0,10 Q 15,3 30,10 T 60,10 T 90,10 T 100,10" fill="none" stroke="var(--brand-primary)" strokeWidth="1" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] tracking-[0.4em] font-black text-white/30 uppercase">
                              Prosody Cadence Wave Synchronized
                            </span>
                          </div>
                        </div>

                        {/* Specific bulleted oral production tips list */}
                        {feedback.tips && feedback.tips.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase px-1">
                              Calibration Plan
                            </h4>
                            <ul className="space-y-2">
                              {feedback.tips.map((tipTxt, index) => (
                                <li 
                                  key={`tip-${index}`}
                                  className="text-xs text-white/60 bg-white/5 border border-white/5 p-3.5 rounded-xl flex gap-3 font-semibold"
                                >
                                  <span className="text-brand-primary font-bold">{index + 1}.</span>
                                  {tipTxt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ScoreMeter({ label, value, color, stroke }: { label: string; value: number; color: string; stroke: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="bg-white/5 border border-white/5 p-5 rounded-[24px] flex items-center justify-around gap-4 hover:border-white/10 transition-colors">
      <div className="text-left space-y-1">
        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">{label}</span>
        <span className="text-2xl font-black text-white">{value}%</span>
      </div>
      
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="32" cy="32" r={radius} className="stroke-white/5 fill-none" strokeWidth="4" />
          <motion.circle 
            cx="32" 
            cy="32" 
            r={radius} 
            className={`${stroke} fill-none`} 
            strokeWidth="4" 
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute text-[10px] font-mono text-white/40 font-black">AI</span>
      </div>
    </div>
  );
}
