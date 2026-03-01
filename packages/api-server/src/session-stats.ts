/**
 * session-stats.ts
 *
 * Post-game statistics recording (Phase 9F).
 * Called after every session reaches 'finished' status to persist:
 *   - HostedSession  (if the host was authenticated)
 *   - PlayerStat     (for each authenticated player)
 *   - UserQuestionStat  (per-user × per-question, upserted)
 *   - QuestionGlobalStat (per-question aggregate across all players, upserted)
 *
 * Designed to be idempotent – re-running on an already-recorded session is a no-op.
 * Errors are caught and logged but never bubble up to block the HTTP response.
 */

import { generateId } from '@quizzquizz/common';
import { getPrisma } from './db/index.js';
import { questionBanks } from './state.js';
import { getSessionQuestions } from './session-utils.js';

/**
 * Re-compute the practice weight for a question after an answer.
 * - Wrong: weight × 1.5 (surface more often)
 * - Correct: weight × 0.8 (surface less often)
 * Clamped to [0.1, 5.0].
 */
function updatePracticeWeight(current: number, isCorrect: boolean): number {
  const next = isCorrect ? current * 0.8 : current * 1.5;
  return Math.min(5.0, Math.max(0.1, next));
}

/**
 * Update a rolling integer average without storing all individual values.
 * newAvg = (oldAvg * oldCount + newValue) / newCount
 */
function rollingAverage(oldAvg: number, oldCount: number, newValue: number): number {
  if (oldCount === 0) return newValue;
  return Math.round((oldAvg * oldCount + newValue) / (oldCount + 1));
}

/**
 * Main entry point.  Call this whenever a session transitions to 'finished'.
 * Safe to call multiple times – idempotent via HostedSession.sessionId unique constraint.
 */
export async function recordSessionStats(sessionId: string): Promise<void> {
  try {
    const prisma = getPrisma();

    // ── 1. Load session ───────────────────────────────────────────────────
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        players: {
          include: { answers: true },
        },
      },
    });

    if (!session) {
      console.error(`[session-stats] Session ${sessionId} not found`);
      return;
    }

    // ── 2. Idempotency guard ──────────────────────────────────────────────
    // HostedSession.sessionId has a @unique constraint; skip if already recorded.
    const alreadyRecorded = await prisma.hostedSession.findUnique({
      where: { sessionId },
    });
    if (alreadyRecorded) {
      return; // Already processed
    }

    // ── 3. Resolve questions that appeared in this session ────────────────
    const questions = getSessionQuestions(session);
    const questionBank = questionBanks.get(session.questionBankId);
    const bankName = questionBank?.metadata.name ?? session.questionBankId;

    // ── 4. Compute final player rankings ─────────────────────────────────
    const sortedPlayers = [...session.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.joinedAt.getTime() - b.joinedAt.getTime(); // earlier join = better tie-break
    });

    // ── 5. Write HostedSession (authenticated host only) ──────────────────
    if (session.userId) {
      await prisma.hostedSession.create({
        data: {
          id: generateId(),
          userId: session.userId,
          sessionId: session.id,
          questionBankId: session.questionBankId,
          questionBankName: bankName,
          totalPlayers: session.players.length,
          totalQuestions: questions.length,
          completedAt: new Date(),
        },
      });
    }

    // ── 6. Per-player stats ───────────────────────────────────────────────
    for (const player of sortedPlayers) {
      const rank = sortedPlayers.findIndex((p) => p.id === player.id) + 1;
      const correct = player.answers.filter((a) => a.isCorrect).length;
      const avgTime =
        player.answers.length > 0
          ? Math.round(
              player.answers.reduce((sum, a) => sum + a.responseTimeMs, 0) /
                player.answers.length
            )
          : 0;

      // ── 6a. PlayerStat (authenticated players only) ────────────────────
      if (player.userId) {
        await prisma.playerStat.create({
          data: {
            id: generateId(),
            userId: player.userId,
            sessionId: session.id,
            nickname: player.nickname,
            finalScore: player.score,
            finalRank: rank,
            correctAnswers: correct,
            totalQuestions: questions.length,
            averageTime: avgTime,
            playedAt: new Date(),
          },
        });

        // ── 6b. UserQuestionStat (one row per user × question) ──────────
        for (const answer of player.answers) {
          // Find the bank-level question to get questionBankId
          const questionBankId = session.questionBankId;

          const existing = await prisma.userQuestionStat.findUnique({
            where: {
              userId_questionBankId_questionId: {
                userId: player.userId,
                questionBankId,
                questionId: answer.questionId,
              },
            },
          });

          const newTimesAnswered = (existing?.timesAnswered ?? 0) + 1;
          const newTimesCorrect = (existing?.timesCorrect ?? 0) + (answer.isCorrect ? 1 : 0);
          const newAvgResponse = rollingAverage(
            existing?.averageResponseMs ?? 0,
            existing?.timesAnswered ?? 0,
            answer.responseTimeMs
          );
          const newPracticeWeight = updatePracticeWeight(
            existing?.practiceWeight ?? 1.0,
            answer.isCorrect
          );

          await prisma.userQuestionStat.upsert({
            where: {
              userId_questionBankId_questionId: {
                userId: player.userId,
                questionBankId,
                questionId: answer.questionId,
              },
            },
            update: {
              timesAnswered: newTimesAnswered,
              timesCorrect: newTimesCorrect,
              averageResponseMs: newAvgResponse,
              lastAnsweredAt: answer.submittedAt,
              lastWasCorrect: answer.isCorrect,
              practiceWeight: newPracticeWeight,
            },
            create: {
              id: generateId(),
              userId: player.userId,
              questionId: answer.questionId,
              questionBankId,
              timesAnswered: 1,
              timesCorrect: answer.isCorrect ? 1 : 0,
              averageResponseMs: answer.responseTimeMs,
              lastAnsweredAt: answer.submittedAt,
              lastWasCorrect: answer.isCorrect,
              practiceWeight: updatePracticeWeight(1.0, answer.isCorrect),
            },
          });
        }
      }
    }

    // ── 7. QuestionGlobalStat (all players, including anonymous) ──────────
    // First: increment timesAppeared for every question that was in this session
    for (const question of questions) {
      const bankId = session.questionBankId;
      const existing = await prisma.questionGlobalStat.findUnique({
        where: { questionBankId_questionId: { questionBankId: bankId, questionId: question.id } },
      });

      if (!existing) {
        await prisma.questionGlobalStat.create({
          data: {
            id: generateId(),
            questionId: question.id,
            questionBankId: bankId,
            timesAppeared: 1,
            timesAnswered: 0,
            timesCorrect: 0,
            averageResponseMs: 0,
            averageScore: 0,
            answerSelections: '{}',
            empiricalDifficulty: null,
          },
        });
      } else {
        await prisma.questionGlobalStat.update({
          where: { questionBankId_questionId: { questionBankId: bankId, questionId: question.id } },
          data: { timesAppeared: { increment: 1 } },
        });
      }
    }

    // Second: process each submitted answer for global stats
    for (const player of session.players) {
      for (const answer of player.answers) {
        const bankId = session.questionBankId;
        const stat = await prisma.questionGlobalStat.findUnique({
          where: { questionBankId_questionId: { questionBankId: bankId, questionId: answer.questionId } },
        });

        if (!stat) continue; // Should not happen after the loop above

        const newTimesAnswered = stat.timesAnswered + 1;
        const newTimesCorrect = stat.timesCorrect + (answer.isCorrect ? 1 : 0);
        const newAvgResponse = rollingAverage(
          stat.averageResponseMs,
          stat.timesAnswered,
          answer.responseTimeMs
        );
        const newAvgScore = rollingAverage(stat.averageScore, stat.timesAnswered, answer.score);

        // Update answerSelections JSON
        let selections: Record<string, number> = {};
        try {
          selections = JSON.parse(stat.answerSelections);
        } catch {
          selections = {};
        }
        const selectedIds: string[] = JSON.parse(answer.selectedAnswerIds);
        for (const answerId of selectedIds) {
          selections[answerId] = (selections[answerId] ?? 0) + 1;
        }

        // Recompute empiricalDifficulty once we have >= 10 answers
        const empiricalDifficulty =
          newTimesAnswered >= 10
            ? Math.round((newTimesCorrect / newTimesAnswered) * 1000) / 1000
            : null;

        await prisma.questionGlobalStat.update({
          where: { questionBankId_questionId: { questionBankId: bankId, questionId: answer.questionId } },
          data: {
            timesAnswered: newTimesAnswered,
            timesCorrect: newTimesCorrect,
            averageResponseMs: newAvgResponse,
            averageScore: newAvgScore,
            answerSelections: JSON.stringify(selections),
            empiricalDifficulty,
          },
        });
      }
    }

    console.log(
      `[session-stats] Recorded stats for session ${sessionId}: ` +
        `${session.players.length} players, ${questions.length} questions`
    );
  } catch (error) {
    // Errors must not block the HTTP response
    console.error(`[session-stats] Failed to record stats for session ${sessionId}:`, error);
  }
}
