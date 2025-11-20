import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { StreamChunk } from "../types";

// Initialize the client
// NOTE: We create a new instance per request to ensure freshness if keys change, 
// but for a simple app, a singleton or lazy init is fine. 
// The prompt requires using process.env.API_KEY
const createClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const streamResearch = async (
  prompt: string,
  onChunk: (chunk: StreamChunk) => void
): Promise<void> => {
  const ai = createClient();
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash', // Optimized for speed + search
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }], // Enable Search Grounding
      },
    });

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      
      // Extract text
      const text = c.text || "";
      
      // Extract grounding metadata if available
      const groundingChunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      onChunk({ text, groundingChunks });
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
