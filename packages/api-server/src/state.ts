import { QuestionBank } from '@quizzquizz/common';

// In-memory storage for question banks (loaded at startup)
export const questionBanks = new Map<string, QuestionBank>();
