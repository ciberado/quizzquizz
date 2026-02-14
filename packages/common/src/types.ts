import { z } from 'zod';

// ============================================================================
// Question and Answer Types
// ============================================================================

export const AnswerSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export type Answer = z.infer<typeof AnswerSchema>;

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  answers: z.array(AnswerSchema),
  correctAnswerIds: z.array(z.string()),
  difficulty: DifficultySchema,
  topics: z.array(z.string()),
  tags: z.array(z.string()),
  timeLimit: z.number().optional(),
});

export type Question = z.infer<typeof QuestionSchema>;

export const QuestionBankMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  topics: z.array(z.string()),
  defaultTimeLimit: z.number().default(20),
});

export type QuestionBankMetadata = z.infer<typeof QuestionBankMetadataSchema>;

export const QuestionBankSchema = z.object({
  id: z.string(),
  metadata: QuestionBankMetadataSchema,
  questions: z.array(QuestionSchema),
});

export type QuestionBank = z.infer<typeof QuestionBankSchema>;

// ============================================================================
// Session Types
// ============================================================================

export const SessionStatusSchema = z.enum(['lobby', 'playing', 'finished']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string().uuid(),
  pin: z.string().length(6),
  hostToken: z.string().uuid(),
  status: SessionStatusSchema,
  questionBankId: z.string(),
  questions: z.array(QuestionSchema),
  currentQuestionIndex: z.number(),
  questionStartedAt: z.number().nullable(),
  automaticPace: z.boolean().optional(),
  createdAt: z.number(),
});

export type Session = z.infer<typeof SessionSchema>;

// ============================================================================
// Player Types
// ============================================================================

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  nickname: z.string().min(1).max(20),
  score: z.number().default(0),
  joinedAt: z.number(),
});

export type Player = z.infer<typeof PlayerSchema>;

export const PlayerAnswerSchema = z.object({
  id: z.string().uuid(),
  playerId: z.string().uuid(),
  sessionId: z.string().uuid(),
  questionId: z.string(),
  selectedAnswerIds: z.array(z.string()),
  submittedAt: z.number(),
  score: z.number(),
});

export type PlayerAnswer = z.infer<typeof PlayerAnswerSchema>;

// ============================================================================
// API Request/Response Types
// ============================================================================

// Session creation
export const CreateSessionRequestSchema = z.object({
  questionBankId: z.string(),
  questionIds: z.array(z.string()).optional(), // Specific question IDs to use (omit for all questions)
  randomOrder: z.boolean().optional(), // Whether to shuffle questions
  automaticPace: z.boolean().optional(), // Auto-advance through questions and leaderboards (4s each)
  questionCount: z.number().min(1).max(50).optional(), // Deprecated - use questionIds instead
  timeLimit: z.number().min(5).max(120).optional(),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const CreateSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  pin: z.string().length(6),
  hostToken: z.string().uuid(),
});

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

// Join session
export const JoinSessionRequestSchema = z.object({
  pin: z.string().length(6),
  nickname: z.string().min(1).max(20),
});

export type JoinSessionRequest = z.infer<typeof JoinSessionRequestSchema>;

export const JoinSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  playerId: z.string().uuid(),
  playerToken: z.string().uuid(),
});

export type JoinSessionResponse = z.infer<typeof JoinSessionResponseSchema>;

// Submit answer
export const SubmitAnswerRequestSchema = z.object({
  questionId: z.string(),
  selectedAnswerIds: z.array(z.string()),
});

export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;

export const SubmitAnswerResponseSchema = z.object({
  correct: z.boolean(),
  score: z.number(),
  correctAnswerIds: z.array(z.string()),
});

export type SubmitAnswerResponse = z.infer<typeof SubmitAnswerResponseSchema>;

// Game state for polling
export const GameStateSchema = z.object({
  status: SessionStatusSchema,
  currentQuestion: QuestionSchema.nullable(),
  questionStartedAt: z.number().nullable(),
  timeLimit: z.number().nullable(),
  totalQuestions: z.number(),
  currentQuestionNumber: z.number(),
  serverTime: z.number(), // Server's current time for clock synchronization
});

export type GameState = z.infer<typeof GameStateSchema>;

// Leaderboard
export const LeaderboardEntrySchema = z.object({
  playerId: z.string().uuid(),
  nickname: z.string(),
  score: z.number(),
  rank: z.number(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardResponseSchema = z.object({
  entries: z.array(LeaderboardEntrySchema),
});

export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;

// Player review (post-game detailed review)
export const QuestionReviewItemSchema = z.object({
  questionId: z.string(),
  questionText: z.string(),
  answers: z.array(AnswerSchema),
  correctAnswerIds: z.array(z.string()),
  playerSelectedAnswerIds: z.array(z.string()),
  isCorrect: z.boolean(),
  pointsEarned: z.number(),
});

export type QuestionReviewItem = z.infer<typeof QuestionReviewItemSchema>;

export const RelativeLeaderboardEntrySchema = z.object({
  playerId: z.string().uuid(),
  nickname: z.string(),
  score: z.number(),
  rank: z.number(),
  isCurrentPlayer: z.boolean(),
});

export type RelativeLeaderboardEntry = z.infer<typeof RelativeLeaderboardEntrySchema>;

export const PlayerReviewResponseSchema = z.object({
  stats: z.object({
    totalQuestions: z.number(),
    correctAnswers: z.number(),
    totalScore: z.number(),
    rank: z.number(),
    totalPlayers: z.number(),
    accuracyPercentage: z.number(),
  }),
  relativeLeaderboard: z.array(RelativeLeaderboardEntrySchema),
  questions: z.array(QuestionReviewItemSchema),
});

export type PlayerReviewResponse = z.infer<typeof PlayerReviewResponseSchema>;

// Question bank preview with filtering
export const QuestionPreviewPaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalQuestions: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type QuestionPreviewPagination = z.infer<typeof QuestionPreviewPaginationSchema>;

export const QuestionPreviewFiltersSchema = z.object({
  difficulty: z.string().nullable(),
  topic: z.string().nullable(),
  tag: z.string().nullable(),
});

export type QuestionPreviewFilters = z.infer<typeof QuestionPreviewFiltersSchema>;

export const QuestionPreviewResponseSchema = z.object({
  questions: z.array(QuestionSchema),
  pagination: QuestionPreviewPaginationSchema,
  filters: QuestionPreviewFiltersSchema,
});

export type QuestionPreviewResponse = z.infer<typeof QuestionPreviewResponseSchema>;
