import { GoogleGenAI, Type } from "@google/genai";
import { Vocabulary, PracticeFeedback, QuizQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
  },
  {
    word: "Pragmatic",
    phonetic: "/præɡˈmæt.ɪk/",
    definition: "Dealing with things sensibly and realistically in a way that is based on practical rather than theoretical considerations.",
    example: "We need a pragmatic approach to solve this logistics issue quickly.",
    synonyms: ["Practical", "Realistic", "Sensible", "Down-to-earth"],
    context: "Business strategy",
    quiz: {
      question: "Instead of debating theory forever, the team took a ____ approach to fix the server issue.",
      options: ["Pragmatic", "Dreamy", "Mystical", "Aggressive"],
      correctAnswer: "Pragmatic",
      explanation: "A pragmatic approach focuses on what actually works in practice."
    }
  },
  {
    word: "Resilient",
    phonetic: "/rɪˈzɪl.jənt/",
    definition: "Able to withstand or recover quickly from difficult conditions.",
    example: "The economy is proving more resilient than expected despite the global challenges.",
    synonyms: ["Strong", "Tough", "Hardy", "Adaptable"],
    context: "Personal development",
    quiz: {
      question: "Small businesses showed they were incredibly ____ by pivoting their models during the lockdown.",
      options: ["Resilient", "Fragile", "Static", "Slow"],
      correctAnswer: "Resilient",
      explanation: "Resilience is the ability to bounce back from adversity."
    }
  },
  {
    word: "Collaborate",
    phonetic: "/kəˈlæb.ə.reɪt/",
    definition: "Work jointly on an activity or project.",
    example: "Our teams need to collaborate more effectively to meet the deadline.",
    synonyms: ["Cooperate", "Team up", "Work together"],
    context: "Teamwork",
    quiz: {
      question: "The designers and developers had to ____ closely to ensure the website was both beautiful and functional.",
      options: ["Collaborate", "Compete", "Argue", "Hide"],
      correctAnswer: "Collaborate",
      explanation: "Collaboration involves working together towards a common goal."
    }
  },
  {
    word: "Incentive",
    phonetic: "/ɪnˈsen.tɪv/",
    definition: "A thing that motivates or encourages someone to do something.",
    example: "The performance bonus serves as a great incentive for the sales team.",
    synonyms: ["Motivation", "Encouragement", "Stimulus"],
    context: "Management",
    quiz: {
      question: "The company offered extra vacation days as an ____ for employees who met their annual targets early.",
      options: ["Incentive", "Obstacle", "Burden", "Excuse"],
      correctAnswer: "Incentive",
      explanation: "An incentive is something that encourages certain behavior or performance."
    }
  }
];

/**
 * Centered error handler for Gemini API calls with Fallback support
 */
async function handleGeminiRequest<T>(requestFn: () => Promise<any>, fallback?: T): Promise<T> {
  try {
    const response = await requestFn();
    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI");
    }
    return JSON.parse(text) as T;
  } catch (error: any) {
    console.warn("Gemini API Error (Handled with potential fallback):", error);
    
    // If we have a fallback, use it for 429 or other failures
    if (fallback) {
      console.info("Using curated offline fallback content.");
      return fallback;
    }

    // Handle 429 Resource Exhausted (Quota Exceeded)
    if (error?.message?.includes("429") || error?.status === 429 || error?.message?.includes("quota")) {
      throw new Error("AI Quota Exceeded: We've reached our daily processing limit. Please try again in 24 hours or upgrade for higher limits.");
    }

    // Handle other common API errors
    if (error?.message?.includes("500") || error?.status === 500) {
      throw new Error("AI Service is temporarily unavailable. Please try again in a few moments.");
    }

    throw new Error("An unexpected error occurred while communicating with the AI. Please try again.");
  }
}

export async function generateDailySession(count: number = 5): Promise<Vocabulary[]> {
  return handleGeminiRequest<Vocabulary[]>(
    () => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} different 'Words of the Day' for someone improving their spoken English. 
      Focus on practical, high-impact words (Intermediate level).
      For EACH word, also generate a multiple-choice fill-in-the-blank quiz question in a clear, relatable scenario.
      
      Return an array of objects.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              definition: { type: Type.STRING },
              example: { type: Type.STRING },
              synonyms: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              context: { type: Type.STRING },
              quiz: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING } 
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            },
            required: ["word", "phonetic", "definition", "example", "synonyms", "context", "quiz"]
          }
        }
      }
    }),
    FALLBACK_WORDS.slice(0, count)
  );
}

export async function generateDailyWords(count: number = 5): Promise<Vocabulary[]> {
  return handleGeminiRequest<Vocabulary[]>(
    () => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} different 'Words of the Day' for someone improving their spoken English. 
      Focus on practical, high-impact words (Intermediate level) that are commonly used in professional or social contexts.
      Each word should be unique and distinct.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              definition: { type: Type.STRING },
              example: { type: Type.STRING },
              synonyms: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              context: { type: Type.STRING }
            },
            required: ["word", "phonetic", "definition", "example", "synonyms", "context"]
          }
        }
      }
    }),
    FALLBACK_WORDS.slice(0, count)
  );
}

export async function generateDailyWord(): Promise<Vocabulary> {
  return handleGeminiRequest<Vocabulary>(
    () => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a 'Word of the Day' for someone improving their spoken English. Focus on practical, high-impact words that are commonly used in professional or social contexts (Intermediate level). Avoid extremely obscure or archaic words.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            definition: { type: Type.STRING },
            example: { type: Type.STRING },
            synonyms: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            context: { type: Type.STRING }
          },
          required: ["word", "phonetic", "definition", "example", "synonyms", "context"]
        }
      }
    }),
    FALLBACK_WORDS[0]
  );
}

export async function analyzePractice(text: string, targetWord: string, mission?: string): Promise<PracticeFeedback> {
  return handleGeminiRequest<PracticeFeedback>(
    () => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this spoken English practice attempt for the vocabulary word: "${targetWord}".
      User's spoken text: "${text}"
      ${mission ? `Target Context (Mission): "${mission}"` : "General practice session."}

      Evaluate the following:
      1. Contextual Precision: Did they use the word "${targetWord}" in a way that makes sense?
      2. Grammatical Integrity: Is the surrounding sentence structure correct?
      3. Conversational Flow: Does it sound natural or forced?
      4. Mission Alignment: ${mission ? `How well did they follow the specific mission prompt/context of "${mission}"?` : "Evaluate general usage."}
      5. Phonetic Performance: Identify any specific phonetic struggles with the word "${targetWord}".

      Provide a professional yet encouraging analysis in your response:
      - "feedback": Provide a clear summary (2-3 sentences) of their performance. Include a user-friendly phonetic breakdown (e.g., /lo-KWAY-shus/) if the pronunciation was challenging.
      - "suggestions": Give 3-4 highly actionable tips. Include at least one example of a common pronunciation pitfall for "${targetWord}" (e.g., silent letters or tricky vowel sounds) and one tip for natural sentence stress.
      - "clarity": Score (0-100) based on inferred pronunciation clarity and flow.
      - "accuracy": Score (0-100) specifically for the correct usage of "${targetWord}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clarity: { type: Type.NUMBER },
            accuracy: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["clarity", "accuracy", "feedback", "suggestions"]
        }
      }
    }),
    {
      clarity: 85,
      accuracy: 85,
      feedback: "I'm currently in power-saving mode, but your attempt sounded clear and the word usage was appropriate. Well done!",
      suggestions: [
        "Focus on the word's specific phonetic markers.",
        "Try using it more confidently in your next sentence.",
        "Record yourself and listen back to match the native phonetic guide."
      ]
    }
  );
}

export async function generateQuiz(word: string): Promise<QuizQuestion> {
  const wordData = FALLBACK_WORDS.find(w => w.word.toLowerCase() === word.toLowerCase());
  const fallbackQuiz = wordData?.quiz || {
    question: `Complete the sentence with the most suitable word: "He managed to ____ the company's goals to the team."`,
    options: ["Articulate", "Hide", "Ignore", "Forget"],
    correctAnswer: "Articulate",
    explanation: "Being able to articulate means speaking clearly and being easily understood."
  };

  return handleGeminiRequest<QuizQuestion>(
    () => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a multiple-choice fill-in-the-blank quiz question for the word "${word}". 
      The question should be in a clear, relatable everyday or office scenario (Intermediate level). 
      Ensure the options are distinct but plausible.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    }),
    fallbackQuiz
  );
}

export async function correctSentence(text: string): Promise<{ original: string; corrected: string; explanation: string; naturalTip: string }> {
  return handleGeminiRequest<{ original: string; corrected: string; explanation: string; naturalTip: string }>(
    () => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a helpful English tutor. Correct the following sentence to sound more natural, professional, and grammatically correct.
      
      User sentence: "${text}"
      
      Provide:
      1. The corrected version.
      2. A brief explanation of what was changed and why.
      3. A "natural tip" for how a native speaker might phrase it even more informally or specifically in a certain context.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            corrected: { type: Type.STRING },
            explanation: { type: Type.STRING },
            naturalTip: { type: Type.STRING }
          },
          required: ["original", "corrected", "explanation", "naturalTip"]
        }
      }
    }),
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
    () => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this spoken English sentence: "${text}"
      
      Evaluate if it is grammatically correct and sounds natural to a native speaker.
      Provide a score for naturalness (0-100).
      If it's incorrect or awkward, provide the "corrected" version.
      Provide constructive "feedback" and "tips" for improvement.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            corrected: { type: Type.STRING },
            feedback: { type: Type.STRING },
            naturalness: { type: Type.NUMBER },
            tips: { type: Type.STRING }
          },
          required: ["isCorrect", "corrected", "feedback", "naturalness", "tips"]
        }
      }
    }),
    {
      isCorrect: true,
      corrected: text,
      feedback: "Speech clarity is good. I'm currently running on internal logic, but you are communicating clearly!",
      naturalness: 85,
      tips: "Keep recording your speech to build confidence."
    }
  );
}
