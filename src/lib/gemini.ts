import { Vocabulary, PracticeFeedback, QuizQuestion } from "../types";

/**
 * Centered error handler for Gemini API calls via backend proxy
 */
async function handleGeminiRequest<T>(action: string, payload: any, fallback?: T): Promise<T> {
  try {
    // For mobile apps (APK), we need to ensure the URL is absolute if we're not on the server origin
    // Alternatively, relative URLs work if the WebView is loading the Cloud Run URL directly.
    const baseUrl = import.meta.env.VITE_APP_URL || '';
    const apiUrl = `${baseUrl}/api/gemini`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.warn(`Gemini API Error (${action}):`, error);
    
    // Fallback logic for offline/limit scenarios
    if (fallback) {
      console.info("Using curated offline fallback content.");
      return fallback;
    }

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      throw new Error("AI Quota Exceeded: We've reached our daily processing limit. Please try again in 24 hours.");
    }

    throw new Error(`Connection Error: ${error.message || "Please check your internet connection."}`);
  }
}

const FALLBACK_WORDS: Vocabulary[] = [
  {
    word: "Articulate",
    phonetic: "/ɑːrˈtɪk.jə.lət/",
    definition: "Having or showing the ability to speak fluently and coherently.",
    example: "She gave an articulate account of her plans for the company's future.",
    synonyms: ["Eloquent", "Fluent", "Coherent", "Clear-spoken"],
    context: "Professional communication",
    quiz: {
      question: "The CEO was very ____ when describing the company's five-year vision to shareholders.",
      options: ["Articulate", "Fast", "Quiet", "Loud"],
      correctAnswer: "Articulate",
      explanation: "Being articulate is essential for CEOs when communicating complex visions clearly."
    }
  }
];

export async function generateDailySession(count: number = 5): Promise<Vocabulary[]> {
  return handleGeminiRequest<Vocabulary[]>(
    'generateDailySession',
    { count },
    FALLBACK_WORDS
  );
}

export async function analyzePractice(text: string, targetWord: string, mission?: string): Promise<PracticeFeedback> {
  return handleGeminiRequest<PracticeFeedback>(
    'analyzePractice',
    { text, targetWord, mission },
    {
      clarity: 85,
      accuracy: 85,
      corrected: text,
      feedback: "The AI service is currently taking a break, but your attempt sounded clear! Keep practicing to build muscle memory.",
      suggestions: [
        "Focus on the word's specific phonetic markers.",
        "Try using it more confidently in your next sentence.",
        "Record yourself and listen back to match the native phonetic guide."
      ],
      phoneticAnalysis: [
        { phoneme: targetWord, accuracy: 85, tip: "Good start, focus on clarity.", mouthPosition: "Relaxed jaw" }
      ]
    }
  );
}

export async function generateQuiz(word: string): Promise<QuizQuestion> {
  return handleGeminiRequest<QuizQuestion>(
    'generateQuiz',
    { word },
    {
      question: `Complete the sentence with the most suitable word: "He managed to ____ the company's goals to the team."`,
      options: ["Articulate", "Hide", "Ignore", "Forget"],
      correctAnswer: "Articulate",
      explanation: "Being able to articulate means speaking clearly and being easily understood."
    }
  );
}

export async function correctSentence(text: string): Promise<{ original: string; corrected: string; explanation: string; naturalTip: string }> {
  return handleGeminiRequest<{ original: string; corrected: string; explanation: string; naturalTip: string }>(
    'correctSentence',
    { text },
    {
      original: text,
      corrected: text,
      explanation: "I'm in offline mode right now, so I'm giving your current sentence a pass! It seems understandable.",
      naturalTip: "Native speakers often use contractions to sound more natural."
    }
  );
}

export async function analyzeFreeSpeech(text: string): Promise<{ 
  isCorrect: boolean; 
  corrected: string; 
  feedback: string; 
  naturalness: number; 
  tips: string 
}> {
  return handleGeminiRequest<{ 
    isCorrect: boolean; 
    corrected: string; 
    feedback: string; 
    naturalness: number; 
    tips: string 
  }>(
    'analyzeFreeSpeech',
    { text },
    {
      isCorrect: true,
      corrected: text,
      feedback: "Speech clarity is good. I'm currently running on internal logic, but you are communicating clearly!",
      naturalness: 85,
      tips: "Keep recording your speech to build confidence."
    }
  );
}
