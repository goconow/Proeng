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

export interface PracticeFeedback {
  clarity: number; // 0-100
  accuracy: number; // 0-100
  feedback: string;
  suggestions: string[];
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
  clarity: number;
  accuracy: number;
  feedback: string;
  suggestions: string[];
  mission: string;
  createdAt: any; // Firestore Timestamp
}
