import { randomBytes, randomUUID } from 'crypto';

/**
 * Generate a random UUID v4
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Generate a unique 6-digit PIN without ambiguous characters
 * Excludes: 0, O, 1, I to avoid confusion
 * Uses digits: 2-9 and letters: A-H, J-N, P-Z (excluding I and O)
 */
export function generatePin(): string {
  // Use digits 2-9 for better readability (no 0, 1)
  const chars = '23456789';
  let pin = '';
  
  for (let i = 0; i < 6; i++) {
    const randomByte = randomBytes(1)[0];
    if (randomByte === undefined) throw new Error('Failed to generate random byte');
    const randomIndex = randomByte % chars.length;
    const char = chars[randomIndex];
    if (char === undefined) throw new Error('Failed to get character');
    pin += char;
  }
  
  return pin;
}

/**
 * Calculate score for a quiz answer using Kahoot-style scoring
 * Formula: basePoints * (1 - (timeTaken / timeLimit) * 0.5)
 * 
 * @param isCorrect - Whether all correct answers were selected
 * @param timeTaken - Time taken to answer in seconds
 * @param timeLimit - Maximum time allowed in seconds
 * @param basePoints - Base points for correct answer (default: 1000)
 * @returns Score (0 if incorrect, time-weighted score if correct)
 */
export function calculateScore(
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number,
  basePoints: number = 1000
): number {
  if (!isCorrect) {
    return 0;
  }
  
  // Ensure timeTaken doesn't exceed timeLimit
  const clampedTime = Math.min(timeTaken, timeLimit);
  
  // Calculate time-based multiplier (faster = higher score)
  const timeRatio = clampedTime / timeLimit;
  const multiplier = 1 - (timeRatio * 0.5);
  
  // Calculate final score and round to nearest integer
  const score = Math.round(basePoints * multiplier);
  
  return Math.max(0, score); // Ensure non-negative
}

/**
 * Check if selected answers match the correct answers exactly
 * 
 * @param selectedIds - Array of selected answer IDs
 * @param correctIds - Array of correct answer IDs
 * @returns true if all correct answers are selected and no incorrect ones
 */
export function isAnswerCorrect(
  selectedIds: string[],
  correctIds: string[]
): boolean {
  if (selectedIds.length !== correctIds.length) {
    return false;
  }
  
  const selectedSet = new Set(selectedIds);
  const correctSet = new Set(correctIds);
  
  // Check all selected are correct
  for (const id of selectedIds) {
    if (!correctSet.has(id)) {
      return false;
    }
  }
  
  // Check all correct are selected
  for (const id of correctIds) {
    if (!selectedSet.has(id)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Simple seeded random number generator using mulberry32 algorithm
 * Same seed always produces the same sequence of random numbers
 * 
 * @param seed - Numeric seed value
 * @returns Function that returns random numbers between 0 and 1
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return function() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string to a numeric seed for seeded random
 * 
 * @param str - String to hash into a seed
 * @returns Numeric seed
 */
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * Returns a new array, does not mutate the original
 * 
 * @param array - Array to shuffle
 * @param seed - Optional seed for deterministic shuffling (string or number)
 * @returns New shuffled array
 */
export function shuffleArray<T>(array: T[], seed?: string | number): T[] {
  const shuffled = [...array];
  
  // Use seeded random if seed is provided
  const random = seed !== undefined 
    ? seededRandom(typeof seed === 'string' ? stringToSeed(seed) : seed)
    : Math.random;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
}

/**
 * Get current timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Count words in a text string
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate automatic question time limit based on question complexity
 * 
 * Heuristic factors:
 * - Question text length (words)
 * - Answer text length (total words across all answers)
 * - Number of answers
 * - Difficulty level (easy = 0.8x, medium = 1.0x, hard = 1.2x)
 * 
 * Formula:
 * - Base time: 15 seconds
 * - +1 second per 4 words in question
 * - +0.5 seconds per 10 words across all answers
 * - +2 seconds per answer option
 * - Apply difficulty multiplier
 * - Cap between 10 and 90 seconds
 * 
 * @param questionText - The question text
 * @param answers - Array of answer objects with text
 * @param difficulty - Question difficulty ('easy' | 'medium' | 'hard')
 * @returns Time limit in seconds
 */
export function calculateAutoQuestionTime(
  questionText: string,
  answers: Array<{ text: string }>,
  difficulty: 'easy' | 'medium' | 'hard'
): number {
  // Base time
  let time = 15;
  
  // Add time based on question length
  const questionWords = countWords(questionText);
  time += Math.floor(questionWords / 4);
  
  // Add time based on answer length
  const totalAnswerWords = answers.reduce((sum, answer) => sum + countWords(answer.text), 0);
  time += Math.floor(totalAnswerWords / 10) * 0.5;
  
  // Add time based on number of answers
  time += answers.length * 2;
  
  // Apply difficulty multiplier
  const difficultyMultiplier = {
    easy: 0.7,
    medium: 1.0,
    hard: 1.4,
  };
  time *= difficultyMultiplier[difficulty];
  
  // Round and cap between 10 and 90 seconds
  return Math.max(10, Math.min(90, Math.round(time)));
}
