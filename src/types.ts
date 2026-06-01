export interface Vocabulary {
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  synonyms: string[];
  context: string;
  quiz?: QuizQuestion;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PhoneticDetail {
  phoneme: string;
  accuracy: number;
  tip: string;
  mouthPosition?: string;
}

export interface PracticeFeedback {
  clarity: number; // 0-100
  accuracy: number; // 0-100
  corrected: string;
  feedback: string;
  suggestions: string[];
  phoneticAnalysis?: PhoneticDetail[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'streak' | 'words_mastered' | 'quiz_score';
  unlocked: boolean;
  progress: number;
}

export interface PracticeHistory {
  id: string;
  userId: string;
  word: string;
  transcript: string;
  corrected: string;
  clarity: number;
  accuracy: number;
  feedback: string;
  suggestions: string[];
  phoneticAnalysis?: PhoneticDetail[];
  mission: string;
  createdAt: any; // Firestore Timestamp
}

export interface ContextualSentence {
  text: string;
  phonetic: string;
  whyNatural: string;
  intonation: string;
}

export interface ContextualScenario {
  scenarioName: string;
  description: string;
  sentences: ContextualSentence[];
}

export interface SentenceFeedback {
  naturalnessScore: number;
  fluencyScore: number;
  soundAccuracy: number;
  feedback: string;
  nativeAlternative?: string;
  tips: string[];
  phoneticAnalysis?: {
    segment: string;
    score: number;
    tip: string;
  }[];
}

