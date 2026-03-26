import { GoogleGenAI } from "@google/genai";

/**
 * API Key Rotation Service
 * Manages multiple Gemini API keys to bypass rate limits.
 */

const KEYS = [
  process.env.API_KEY,
  process.env.GEMINI_API_KEY,
  import.meta.env.VITE_GEMINI_KEY_1,
  import.meta.env.VITE_GEMINI_KEY_2,
  import.meta.env.VITE_GEMINI_KEY_3,
].filter(Boolean) as string[];

// Add the keys provided by the user as a fallback if not in env
const USER_PROVIDED_KEYS = [
  "AIzaSyD7EaDgnTfxCYfgeFCJsp_IppqInpMUaaE",
  "AIzaSyCaP07ELXp6Ifsqj2VsZgUdxBexswGdZWA"
];

const ALL_KEYS = [...new Set([...KEYS, ...USER_PROVIDED_KEYS])];

let currentKeyIndex = 0;

export function getNextApiKey(): string {
  if (ALL_KEYS.length === 0) return "";
  const key = ALL_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % ALL_KEYS.length;
  return key;
}

export function getGenAI(forceNext = false): GoogleGenAI {
  const apiKey = getNextApiKey();
  return new GoogleGenAI({ apiKey });
}

export function getAllKeysCount(): number {
  return ALL_KEYS.length;
}
