/**
 * Type definitions for the analytics package.
 * Mirrors the Prisma model shapes without importing `@prisma/client` directly.
 * The api-server passes its Prisma instance which satisfies the PrismaLike interface.
 */

export interface HostedSessionRow {
  id: string;
  userId: string;
  sessionId: string;
  questionBankId: string;
  questionBankName: string;
  totalPlayers: number;
  totalQuestions: number;
  completedAt: Date;
}

export interface PlayerStatRow {
  id: string;
  userId: string;
  sessionId: string;
  nickname: string;
  finalScore: number;
  finalRank: number;
  correctAnswers: number;
  totalQuestions: number;
  averageTime: number;
  playedAt: Date;
}

export interface UserQuestionStatRow {
  id: string;
  userId: string;
  questionId: string;
  questionBankId: string;
  timesAnswered: number;
  timesCorrect: number;
  averageResponseMs: number;
  lastAnsweredAt: Date | null;
  lastWasCorrect: boolean;
  practiceWeight: number;
}

export interface QuestionGlobalStatRow {
  id: string;
  questionId: string;
  questionBankId: string;
  timesAppeared: number;
  timesAnswered: number;
  timesCorrect: number;
  averageResponseMs: number;
  averageScore: number;
  answerSelections: string; // JSON string
  empiricalDifficulty: number | null;
  updatedAt: Date;
}

export interface PlayerAnswerRow {
  id: string;
  playerId: string;
  questionId: string;
  selectedAnswerIds: string; // JSON string
  isCorrect: boolean;
  submittedAt: Date;
  score: number;
  responseTimeMs: number;
  player: {
    id: string;
    sessionId: string;
    userId: string | null;
    nickname: string;
    score: number;
  };
}

/**
 * Minimal Prisma-like interface the analytics loaders require.
 * The api-server's PrismaClient satisfies this interface.
 */
export interface AnalyticsPrismaClient {
  playerAnswer: {
    findMany(args: {
      where: Record<string, unknown>;
      include?: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      skip?: number;
    }): Promise<PlayerAnswerRow[]>;
  };
  player: {
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      skip?: number;
    }): Promise<{ id: string; sessionId: string; userId: string | null; nickname: string; score: number; joinedAt: Date }[]>;
  };
  questionGlobalStat: {
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      skip?: number;
    }): Promise<QuestionGlobalStatRow[]>;
  };
  hostedSession: {
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      skip?: number;
    }): Promise<HostedSessionRow[]>;
    findFirst(args: {
      where: Record<string, unknown>;
    }): Promise<HostedSessionRow | null>;
  };
  playerStat: {
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      skip?: number;
    }): Promise<PlayerStatRow[]>;
  };
  userQuestionStat: {
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      skip?: number;
    }): Promise<UserQuestionStatRow[]>;
  };
}
