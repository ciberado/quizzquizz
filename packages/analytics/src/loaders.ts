/**
 * Data loader functions — thin Prisma query layer.
 * Each function fetches the rows needed by analytics computation modules.
 */
import type { AnalyticsPrismaClient, PlayerAnswerRow, PlayerStatRow, QuestionGlobalStatRow, HostedSessionRow, UserQuestionStatRow } from './types.js';

export async function loadSessionAnswers(
  db: AnalyticsPrismaClient,
  sessionId: string,
): Promise<PlayerAnswerRow[]> {
  return db.playerAnswer.findMany({
    where: { player: { sessionId } },
    include: { player: true },
    orderBy: { submittedAt: 'asc' },
  });
}

export async function loadSessionPlayers(
  db: AnalyticsPrismaClient,
  sessionId: string,
): Promise<{ id: string; sessionId: string; userId: string | null; nickname: string; score: number; joinedAt: Date }[]> {
  return db.player.findMany({
    where: { sessionId },
    orderBy: { score: 'desc' },
  });
}

export async function loadBankGlobalStats(
  db: AnalyticsPrismaClient,
  questionBankId: string,
): Promise<QuestionGlobalStatRow[]> {
  return db.questionGlobalStat.findMany({
    where: { questionBankId },
    orderBy: { questionId: 'asc' },
  });
}

export async function loadHostedSessions(
  db: AnalyticsPrismaClient,
  userId: string,
  questionBankId?: string,
): Promise<HostedSessionRow[]> {
  return db.hostedSession.findMany({
    where: {
      userId,
      ...(questionBankId ? { questionBankId } : {}),
    },
    orderBy: { completedAt: 'asc' },
  });
}

export async function loadPlayerStats(
  db: AnalyticsPrismaClient,
  userId: string,
): Promise<PlayerStatRow[]> {
  return db.playerStat.findMany({
    where: { userId },
    orderBy: { playedAt: 'asc' },
  });
}

export async function loadUserQuestionStats(
  db: AnalyticsPrismaClient,
  userId: string,
  bankId?: string,
): Promise<UserQuestionStatRow[]> {
  return db.userQuestionStat.findMany({
    where: {
      userId,
      ...(bankId ? { questionBankId: bankId } : {}),
    },
    orderBy: { practiceWeight: 'desc' },
  });
}

export async function loadPlayerAnswersForUser(
  db: AnalyticsPrismaClient,
  userId: string,
): Promise<PlayerAnswerRow[]> {
  return db.playerAnswer.findMany({
    where: { player: { userId } },
    include: { player: true },
    orderBy: { submittedAt: 'asc' },
  });
}
