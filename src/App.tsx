import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, History, LayoutDashboard, Settings as SettingsIcon, Menu, X, ChevronLeft, ChevronRight, Crown, LogOut, LogIn, AlertCircle, Trophy } from 'lucide-react';
import WordCard from './components/WordCard';
import PracticeSession from './components/PracticeSession';
import DailyQuiz from './components/DailyQuiz';
import CorrectionLab from './components/CorrectionLab';
import Pricing from './components/Pricing';
import Achievements from './components/Achievements';
import AchievementToast from './components/AchievementToast';
import PracticeHistory from './components/PracticeHistory';
import { generateDailySession } from './lib/gemini';
import { Vocabulary, Achievement } from './types';
import { useAuth } from './context/AuthContext';
import { testConnection } from './lib/firebase';

const CACHE_KEY = 'vocab_daily_session';

import AdBanner, { Interstitial } from './components/AdBanner';

export default function App() {
  const { user, signIn, logOut, isSigningIn, isSigningOut, authError, clearError } = useAuth();
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      setIsPro(true);
      setActiveToast("Premium Membership Activated");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      // Optional: show a message that payment was cancelled
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const [words, setWords] = useState<Vocabulary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(5); // Mock streak
  const [activeView, setActiveView] = useState<'dashboard' | 'history'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPro, setIsPro] = useState(() => {
    return localStorage.getItem('proeng_is_pro') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('proeng_is_pro', isPro.toString());
  }, [isPro]);

  useEffect(() => {
    const handleOpenPricing = () => setShowPricing(true);
    window.addEventListener('open-pricing', handleOpenPricing);
    return () => window.removeEventListener('open-pricing', handleOpenPricing);
  }, []);
  const [showPricing, setShowPricing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [masteredWords, setMasteredWords] = useState<string[]>(() => {
    const saved = localStorage.getItem('mastered_words');
    return saved ? JSON.parse(saved) : [];
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: '1', title: 'Early Riser', description: 'Maintain a 3-day streak', icon: 'zap', requirement: 3, type: 'streak', unlocked: false, progress: 0 },
    { id: '2', title: 'Vocabulary Scout', description: 'Master 5 new words', icon: 'book', requirement: 5, type: 'words_mastered', unlocked: false, progress: 0 },
    { id: '3', title: 'Loyal Scholar', description: 'Maintain a 7-day streak', icon: 'shield', requirement: 7, type: 'streak', unlocked: false, progress: 0 },
    { id: '4', title: 'Verbal Titan', description: 'Master 20 new words', icon: 'trophy', requirement: 20, type: 'words_mastered', unlocked: false, progress: 0 },
    { id: '5', title: 'Perfect Score', description: 'Complete 10 quizzes perfectly', icon: 'target', requirement: 10, type: 'quiz_score', unlocked: false, progress: 0 },
  ]);

  useEffect(() => {
    localStorage.setItem('mastered_words', JSON.stringify(masteredWords));
    
    setAchievements(prev => {
      const newAchievements = prev.map(achievement => {
        let progress = 0;
        if (achievement.type === 'streak') progress = streak;
        if (achievement.type === 'words_mastered') progress = masteredWords.length;
        
        const unlocked = progress >= achievement.requirement;
        
        // If it was just unlocked, show toast
        if (unlocked && !achievement.unlocked) {
          setActiveToast(achievement.title);
        }
        
        return { ...achievement, progress, unlocked };
      });
      return newAchievements;
    });
  }, [streak, masteredWords]);

  useEffect(() => {
    testConnection(); // Verify Firebase connection
    async function load() {
      // Check cache first
      const today = new Date().toISOString().split('T')[0];
      const cached = localStorage.getItem(CACHE_KEY);
      
      if (cached) {
        const { date, data } = JSON.parse(cached);
        if (date === today && data && data.length > 0) {
          setWords(data);
          setLoading(false);
          return;
        }
      }

      setError(null);
      try {
        const wordList = await generateDailySession(5);
        setWords(wordList);
        
        // Cache the result
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          date: today,
          data: wordList
        }));
      } catch (error: any) {
        console.error('Failed to load session content', error);
        setError(error.message || 'Failed to load today\'s session. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleNextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const toggleMastered = (word: string) => {
    setMasteredWords(prev => 
      prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]
    );
  };

  return (
    <div className="relative min-h-screen">
      <div className="atmosphere" />
      
      {/* Navigation Rail / Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
          />
        )}
      </AnimatePresence>

      <nav className={`fixed left-0 top-0 h-full glass border-r z-[100] transition-all duration-500 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'} flex flex-col items-center py-8 gap-12`}>
        <div className="px-4 w-full flex justify-between items-center md:justify-center">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(242,125,38,0.4)]">
              <Sparkles className="text-white" size={20} />
            </div>
            {isSidebarOpen && <span className="ml-4 font-black text-xl tracking-tighter">Proeng</span>}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-white/5 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

          <div className="flex flex-col gap-8 w-full px-4">
            <NavItem 
              icon={<LayoutDashboard size={22} />} 
              label="Dashboard" 
              active={activeView === 'dashboard'} 
              isOpen={isSidebarOpen} 
              onClick={() => {
                setActiveView('dashboard');
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
            />
            <NavItem 
              icon={<Trophy size={22} />} 
              label="Achievements" 
              isOpen={isSidebarOpen} 
              onClick={() => {
                setShowAchievements(true);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
            />
            <NavItem 
              icon={<History size={22} />} 
              label="History" 
              active={activeView === 'history'} 
              isOpen={isSidebarOpen} 
              onClick={() => {
                setActiveView('history');
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
            />
            <NavItem 
              icon={<Crown size={22} className={isPro ? "text-brand-primary" : ""} />} 
              label={isPro ? "Pro Member" : "Upgrade to Pro"} 
              isOpen={isSidebarOpen} 
              onClick={() => {
                setShowPricing(true);
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
            />
            {user ? (
              <NavItem 
                icon={isSigningOut ? <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /> : <LogOut size={22} />} 
                label={isSigningOut ? "Signing Out..." : "Sign Out"} 
                isOpen={isSidebarOpen} 
                onClick={() => {
                  logOut();
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }} 
              />
            ) : (
              <NavItem 
                icon={isSigningIn ? <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /> : <LogIn size={22} />} 
                label={isSigningIn ? "Signing In..." : "Sign In"} 
                isOpen={isSidebarOpen} 
                onClick={() => {
                  signIn();
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }} 
              />
            )}
            <NavItem 
              icon={<SettingsIcon size={22} />} 
              label="Settings" 
              isOpen={isSidebarOpen} 
              onClick={() => setShowSettings(true)}
            />
            
            {/* Ad Placement in Sidebar */}
            {isSidebarOpen && !isPro && (
              <div className="px-4 mt-auto mb-8 w-full">
                <AdBanner isPro={isPro} type="sidebar" />
              </div>
            )}
          </div>

        <div className="mt-auto pb-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-3 hover:bg-white/5 rounded-xl transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`min-h-screen transition-all duration-500 ${isSidebarOpen ? 'md:pl-64' : 'md:pl-20'}`}>
        <AnimatePresence>
          {showPricing && (
            <Pricing 
              key="pricing-modal"
              isPro={isPro}
              onUpgrade={() => {
                setIsPro(true);
                setShowPricing(false);
              }} 
              onClose={() => setShowPricing(false)} 
            />
          )}

          {showInterstitial && (
            <Interstitial 
              key="interstitial-modal"
              isPro={isPro} 
              onClose={() => setShowInterstitial(false)} 
            />
          )}
          {showSettings && (
            <div key="settings-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                key="settings-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              />
              <motion.div 
                key="settings-content"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl glass border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
              >
                <div className="flex-1 overflow-y-auto p-8 md:p-12 scroll-smooth">
                  <div className="flex justify-between items-start mb-12">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setShowSettings(false)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-white/60 hover:text-white flex items-center gap-2 group"
                      >
                        <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                        <span className="text-[10px] font-black uppercase tracking-widest pr-2 hidden sm:block">Back</span>
                      </button>
                      <div>
                        <h2 className="text-3xl font-black italic serif-italic mb-2 text-white">Account Settings</h2>
                        <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Manage your profile & preferences</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-white/40 hover:text-white"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5">
                      <div className="w-20 h-20 rounded-full border-2 border-brand-primary/30 p-1">
                        <img 
                          src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                          className="w-full h-full rounded-full object-cover"
                          alt="Profile"
                        />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{user?.displayName}</h3>
                        <p className="text-sm text-white/40 mb-4">{user?.email}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-black uppercase text-brand-primary">
                            {isPro ? 'Pro Member' : 'Free Tier'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-[10px] font-black uppercase text-yellow-400">
                            {streaksDescription(streak)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <button 
                        onClick={() => {
                          setShowSettings(false);
                          setShowAchievements(true);
                        }}
                        className="flex flex-col gap-2 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-brand-primary/50 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                          <Trophy size={18} className="text-brand-primary" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Milestones</h4>
                        <p className="text-xs text-white/40">View your earned badges and progress.</p>
                      </button>
                      <SettingsSection title="Preferences" items={['Email Notifications', 'Dark Mode Sync', 'Language Primitives']} />
                    </div>
                  </div>

                  <div className="mt-12 flex justify-end gap-4 border-t border-white/5 pt-8">
                    <button 
                      onClick={logOut}
                      className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      Sign Out
                    </button>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="px-8 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {showAchievements && (
            <Achievements 
              key="achievements-modal"
              achievements={achievements} 
              onClose={() => setShowAchievements(false)} 
            />
          )}
          {activeToast && (
            <AchievementToast 
              key={`toast-${activeToast}`}
              title={activeToast} 
              onClose={() => setActiveToast(null)} 
            />
          )}
            {authError && (
              <div 
                key="auth-error-toast"
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
              >
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="p-4 bg-red-500/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/20 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span className="font-bold text-xs uppercase tracking-widest">Auth Notification</span>
                  </div>
                  <p className="text-sm font-medium">{authError}</p>
                  <button 
                    onClick={clearError}
                    className="mt-2 py-2 w-full bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Dismiss
                  </button>
                </motion.div>
              </div>
            )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeView === 'history' ? (
            <motion.div
              key="history-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PracticeHistory onBack={() => setActiveView('dashboard')} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Dashboard Ad Placement */}
              <div className="px-4 md:px-8 mt-8 max-w-7xl mx-auto">
                <AdBanner isPro={isPro} type="banner" />
              </div>

              <header className="px-4 md:px-8 py-8 md:py-12 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 glass rounded-xl text-brand-primary"
                  >
                    <Menu size={24} />
                  </button>
                  <div className="hidden sm:block">
                    <h1 className="text-sm uppercase tracking-[0.3em] font-black text-white/40 mb-1">Session Status</h1>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-bold text-white/80">LIVE • VOCABULARY ENGINE ACTIVE</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {!isPro && (
                    <button 
                      onClick={() => setShowPricing(true)}
                      className="hidden md:flex items-center gap-2 px-6 py-2 bg-brand-primary rounded-full text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)]"
                    >
                      <Crown size={14} />
                      Get Pro
                    </button>
                  )}
                  
                  {isPro && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/30 rounded-full text-brand-primary text-[10px] font-black uppercase tracking-widest">
                      <Crown size={14} />
                      Pro Member
                    </div>
                  )}

                  <div className="px-4 py-2 glass rounded-full flex items-center gap-3 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-white/40">Current Streak</span>
                    <span className="text-brand-primary font-black">{streak} Days</span>
                  </div>
                  
                  {user ? (
                    <div className="flex items-center gap-4 relative">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black uppercase text-white/80">{user.displayName}</p>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest">Premium Member</p>
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-primary/50 transition-colors"
                        >
                          <img 
                            src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                            alt="User Avatar" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </button>

                        {/* Professional Dropdown */}
                        <AnimatePresence>
                          {isUserMenuOpen && (
                            <motion.div 
                              key="user-profile-menu"
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute right-0 top-full mt-4 w-64 glass border border-white/10 rounded-2xl p-4 shadow-2xl z-50 pointer-events-auto"
                            >
                              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                                    alt="User Avatar" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-black uppercase truncate text-white">{user.displayName}</span>
                                  <span className="text-[8px] text-white/40 truncate lowercase">{user.email}</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-1">
                                <button 
                                  onClick={() => {
                                    setShowPricing(true);
                                    setIsUserMenuOpen(false);
                                  }}
                                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-brand-primary/10 text-[10px] font-bold uppercase tracking-widest text-brand-primary hover:text-brand-primary transition-all text-left mb-1"
                                >
                                  <Crown size={14} />
                                  Upgrade to Pro
                                </button>
                                <button 
                                  onClick={() => {
                                    setShowSettings(true);
                                    setIsUserMenuOpen(false);
                                  }}
                                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-all text-left"
                                >
                                  <LayoutDashboard size={14} className="text-brand-primary" />
                                  Account Settings
                                </button>
                                <button 
                                  onClick={() => {
                                    setIsUserMenuOpen(false);
                                    logOut();
                                  }}
                                  disabled={isSigningOut}
                                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-all text-left mt-2 disabled:opacity-50"
                                >
                                  {isSigningOut ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                      Signing Out...
                                    </>
                                  ) : (
                                    <>
                                      <LogOut size={14} />
                                      Sign Out Session
                                    </>
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={signIn}
                      disabled={isSigningIn}
                      className="flex items-center gap-2 px-6 py-2 glass border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSigningIn ? (
                        <>
                          <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                          Authenticating...
                        </>
                      ) : "Sign In"}
                    </button>
                  )}
                </div>
              </header>

              <div className="px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center md:items-start">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-32 w-full"
                    >
                      <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-brand-primary font-bold tracking-widest text-[10px] uppercase">Synthesizing Daily Wisdom...</span>
                    </motion.div>
                  ) : error ? (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-6 py-32 w-full text-center"
                    >
                      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="text-red-500" size={32} />
                      </div>
                      <div className="max-w-md">
                        <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
                        <p className="text-sm text-white/40 leading-relaxed italic">{error}</p>
                      </div>
                      <button 
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Reload Experience
                      </button>
                    </motion.div>
                  ) : words.length > 0 && (
                    <motion.div 
                      key="content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full"
                    >
                      <section className="py-12 relative">
                        <div className="flex flex-col items-center md:items-start">
                          <div className="flex items-center gap-2 md:gap-8 w-full max-w-5xl px-0 md:px-4 mb-8">
                             <button 
                              onClick={handlePrevWord}
                              disabled={currentIndex === 0}
                              className={`p-2 md:p-4 rounded-full glass border border-white/10 transition-all ${currentIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-brand-primary/20 hover:border-brand-primary/50'}`}
                             >
                               <ChevronLeft size={20} className="md:w-6 md:h-6" />
                             </button>

                             <div className="flex-1 min-w-0">
                                <WordCard 
                                  data={words[currentIndex]} 
                                  onSpeak={speak} 
                                  isMastered={masteredWords.includes(words[currentIndex].word)}
                                  onMaster={() => toggleMastered(words[currentIndex].word)}
                                />
                             </div>

                             <button 
                              onClick={handleNextWord}
                              disabled={currentIndex === words.length - 1}
                              className={`p-2 md:p-4 rounded-full glass border border-white/10 transition-all ${currentIndex === words.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-brand-primary/20 hover:border-brand-primary/50'}`}
                             >
                               <ChevronRight size={20} className="md:w-6 md:h-6" />
                             </button>
                          </div>

                          <div className="flex gap-2">
                             {words.map((_, i) => (
                               <div 
                                 key={`session-dot-${i}`} 
                                 className={`h-1.5 transition-all duration-500 rounded-full ${i === currentIndex ? 'w-12 bg-brand-primary' : 'w-4 bg-white/10'}`}
                               />
                             ))}
                          </div>
                        </div>
                      </section>

                      <section className="py-12">
                        <PracticeSession 
                          targetWord={words[currentIndex].word} 
                          isPro={isPro} 
                          onUpgrade={() => setShowPricing(true)} 
                          onPracticeComplete={() => {
                            if (!isPro) {
                              // Show interstitial 50% of the time for free users
                              if (Math.random() > 0.5) {
                                setTimeout(() => setShowInterstitial(true), 2000);
                              }
                            }
                          }}
                        />
                      </section>

                      {words[currentIndex].quiz && (
                        <section className="py-12 border-t border-white/5">
                          <DailyQuiz quiz={words[currentIndex].quiz} />
                        </section>
                      )}

                      <section className="py-12 border-t border-white/5">
                        <CorrectionLab />
                      </section>

                      {/* Categories / Themes */}
                      <section className="py-24 border-t border-white/5 w-full">
                        <div className="mb-12">
                          <h3 className="text-xs uppercase tracking-[0.4em] font-black text-white/20 mb-4">Expansion Paths</h3>
                          <h2 className="text-4xl font-bold italic serif-italic">Personalize your journey</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <ThemeCard 
                            title="Business Professional" 
                            description="Master the art of corporate storytelling and high-stakes negotiation vocab."
                            gradient="from-blue-500/20 to-cyan-500/20"
                          />
                          <ThemeCard 
                            title="Social Eloquence" 
                            description="Elevate your casual banter and deep conversations with nuanced expressions."
                            gradient="from-purple-500/20 to-pink-500/20"
                          />
                          <ThemeCard 
                            title="Travel & Exploration" 
                            description="Navigate the world with precision and connect with locals on a deeper level."
                            gradient="from-orange-500/20 to-yellow-500/20"
                          />
                        </div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="md:pl-20 py-12 px-8 border-t border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-brand-primary font-black tracking-tighter text-2xl">Proeng</span>
            <p className="text-white/40 text-[10px] uppercase tracking-widest leading-relaxed max-w-sm">
              Your voice, amplified by intelligence. <br />
              Proeng is a signature experimental environment.
            </p>
          </div>
          
          <div className="flex gap-12">
            <FooterLink label="Privacy" />
            <FooterLink label="Terms" />
            <FooterLink label="Feedback" />
          </div>

          <div className="text-white/20 text-xs font-mono">
            v1.0.4 • SYSTEM_STABLE
          </div>
        </div>
      </footer>
    </div>
  );
}

function SettingsSection({ title, items }: { title: string, items: string[] }) {
  return (
    <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">{title}</h4>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <label key={`${item}-${idx}`} className="flex items-center justify-between group cursor-pointer">
            <span className="text-sm text-white/60 group-hover:text-white transition-colors">{item}</span>
            <div className="w-8 h-4 rounded-full bg-white/10 relative p-1 group-hover:bg-white/20 transition-colors">
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function streaksDescription(streak: number) {
  if (streak < 3) return "Fresh Starter";
  if (streak < 7) return "Weekly Warrior";
  if (streak < 14) return "Linguistic Legend";
  return "Language Titan";
}

function NavItem({ icon, label, active = false, isOpen = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, isOpen?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center group transition-all duration-300 ${active ? 'text-brand-primary px-2' : 'text-white/50 hover:text-white px-2'}`}
    >
      <div className={`p-3 rounded-xl transition-all ${active ? 'bg-brand-primary/10 border border-brand-primary/20 shadow-[0_0_15px_rgba(242,125,38,0.1)]' : 'hover:bg-white/5'}`}>
        {icon}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.span 
            key="nav-label"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={`ml-4 font-bold text-sm tracking-tight whitespace-nowrap`}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function ThemeCard({ title, description, gradient }: { title: string, description: string, gradient: string }) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className={`glass p-8 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all`}
    >
      <div className={`absolute -right-4 -bottom-4 w-32 h-32 bg-gradient-to-br ${gradient} blur-3xl opacity-50 group-hover:opacity-80 transition-opacity`} />
      <h4 className="text-xl font-bold mb-4 z-10 relative">{title}</h4>
      <p className="text-sm text-white/40 leading-relaxed mb-6 z-10 relative">{description}</p>
      <button className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-2 group/btn z-10 relative">
        Explore Path <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <a href="#" className="text-[10px] uppercase tracking-widest font-bold text-white/30 hover:text-brand-primary transition-colors">
      {label}
    </a>
  );
}

