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
 * Shuffle an array using Fisher-Yates algorithm
 * Returns a new array, does not mutate the original
 * 
 * @param array - Array to shuffle
 * @returns New shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
