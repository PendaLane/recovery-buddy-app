import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const ENV_API_KEY = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

const readStoredKey = (): string => {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem("aiApiKey") || "";
  } catch (error) {
    console.warn("Unable to read AI API key from storage", error);
    return "";
  }
};

let activeApiKey = ENV_API_KEY || readStoredKey();
let ai = activeApiKey ? new GoogleGenAI({ apiKey: activeApiKey }) : null;

export const setApiKey = (key: string) => {
  activeApiKey = key.trim();

  if (typeof localStorage !== "undefined") {
    try {
      if (activeApiKey) {
        localStorage.setItem("aiApiKey", activeApiKey);
      } else {
        localStorage.removeItem("aiApiKey");
      }
    } catch (error) {
      console.warn("Unable to persist AI API key", error);
    }
  }

  ai = activeApiKey ? new GoogleGenAI({ apiKey: activeApiKey }) : null;
};

export const getApiKeyStatus = () => ({
  hasKey: Boolean(activeApiKey),
  source: activeApiKey === ENV_API_KEY ? "env" : activeApiKey ? "saved" : "none",
});

const getClient = () => {
  if (ai) return ai;

  const storedKey = readStoredKey();
  if (storedKey) {
    ai = new GoogleGenAI({ apiKey: storedKey });
    activeApiKey = storedKey;
  }
  return ai;
};

const SYSTEM_INSTRUCTION_COACH = `
You are "Recovery Buddy", a compassionate, non-judgmental, and wise recovery coach and sponsor. 
Your goal is to support the user in their sobriety from alcohol and substances.
- Use empathetic, supportive language.
- Provide practical advice based on 12-step principles (AA/NA), CBT (Cognitive Behavioral Therapy), and mindfulness.
- If the user seems to be in immediate danger or self-harm crisis, gently suggest they call 988 or emergency services immediately, but continue to be supportive.
- Keep responses concise (under 150 words) unless asked for a detailed explanation.
- Do not be preachy. Be a peer.
`;

export const getAICoachResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
  const client = getClient();
  if (!client) return "Error: API Key is missing. Please check your configuration.";

  try {
    const model = 'gemini-2.5-flash';
    
    const recentHistory = history.slice(-10).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const chat = client.chats.create({
      model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_COACH,
        temperature: 0.7,
      },
      history: recentHistory
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I'm here with you, but I couldn't process that response.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
};

export const analyzeJournalEntry = async (entryText: string, mood: string): Promise<string> => {
  const client = getClient();
  if (!client) return "Unable to generate reflection without API Key.";

  try {
    const prompt = `
      The user wrote this journal entry with a mood of "${mood}":
      "${entryText}"
      
      Please provide a brief, compassionate reflection (max 3 sentences). 
      Highlight a strength they showed or offer a gentle perspective shift. 
      End with a short encouraging affirmation.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Keep going. Writing is a powerful tool for healing.";
  } catch (error) {
    console.error("Gemini Journal Analysis Error:", error);
    return "Great job logging your thoughts.";
  }
};
