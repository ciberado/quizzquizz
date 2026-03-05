import { QuestionBank } from '@quizzquizz/common';
import type { QuestionBankFolder } from '@quizzquizz/question-bank';

// In-memory storage for question banks (loaded at startup)
export const questionBanks = new Map<string, QuestionBank>();

// Folder tree for the browse API — use getter/setter so the reload route can
// replace the whole tree without running into ESM live-binding read-only limits.
let _bankTree: QuestionBankFolder = { name: '', path: '', folders: [], banks: [] };

export const getBankTree = (): QuestionBankFolder => _bankTree;
export const setBankTree = (tree: QuestionBankFolder): void => { _bankTree = tree; };
