// services/api/src/config/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const { 
  GEMINI_API_KEY, 
  GEMINI_TEXT_MODEL, 
  GEMINI_EMBEDDING_MODEL, 
  EMBEDDING_DIM 
} = process.env;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY no está configurado en .env");
}

export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const config = {
  apiKey: GEMINI_API_KEY,
  textModel: GEMINI_TEXT_MODEL || 'gemini-1.5-flash',
  embeddingModel: GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  embeddingDim: parseInt(EMBEDDING_DIM) || 768
};

export default genAI;