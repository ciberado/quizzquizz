import { test, expect } from '@playwright/test';

test.describe('QuizzQuizz API E2E Tests', () => {
  test('complete quiz session flow', async ({ request }) => {
    // Step 1: Health check
    const healthResponse = await request.get('/health');
    expect(healthResponse.ok()).toBeTruthy();
    const health = await healthResponse.json();
    expect(health.status).toBe('ok');
    console.log('✓ Health check passed');

    // Step 2: List question banks
    const banksResponse = await request.get('/api/question-banks');
    expect(banksResponse.ok()).toBeTruthy();
    const banks = await banksResponse.json();
    expect(banks.questionBanks).toBeDefined();
    expect(banks.questionBanks.length).toBeGreaterThan(0);
    const questionBank = banks.questionBanks[0];
    console.log(`✓ Found ${banks.questionBanks.length} question bank(s): ${questionBank.name}`);

    // Step 3: Get specific question bank details
    const bankDetailResponse = await request.get(`/api/question-banks/${questionBank.id}`);
    expect(bankDetailResponse.ok()).toBeTruthy();
    const bankDetail = await bankDetailResponse.json();
    expect(bankDetail.questions).toBeDefined();
    expect(bankDetail.questions.length).toBeGreaterThan(0);
    console.log(`✓ Question bank has ${bankDetail.questions.length} questions`);

    // Step 4: Create a new session
    const createSessionResponse = await request.post('/api/sessions', {
      data: {
        questionBankId: questionBank.id,
      },
    });
    expect(createSessionResponse.ok()).toBeTruthy();
    expect(createSessionResponse.status()).toBe(201);
    const session = await createSessionResponse.json();
    expect(session.id).toBeDefined();
    expect(session.pin).toBeDefined();
    expect(session.hostToken).toBeDefined();
    expect(session.pin).toHaveLength(6);
    expect(session.status).toBe('lobby');
    console.log(`✓ Created session with PIN: ${session.pin}`);

    // Step 5: Get session with host token
    const getSessionResponse = await request.get(`/api/sessions/${session.id}`, {
      headers: {
        'X-Host-Token': session.hostToken,
      },
    });
    expect(getSessionResponse.ok()).toBeTruthy();
    const sessionData = await getSessionResponse.json();
    expect(sessionData.id).toBe(session.id);
    expect(sessionData.pin).toBe(session.pin);
    expect(sessionData.hostToken).toBeUndefined(); // Should not be returned
    console.log('✓ Retrieved session with host token');

    // Step 6: Try to get session without host token (should fail)
    const unauthorizedResponse = await request.get(`/api/sessions/${session.id}`);
    expect(unauthorizedResponse.status()).toBe(401);
    console.log('✓ Unauthorized access correctly rejected');

    // Step 7: Join session as Player 1
    const joinPlayer1Response = await request.post('/api/sessions/join', {
      data: {
        pin: session.pin,
        nickname: 'PlayerOne',
      },
    });
    expect(joinPlayer1Response.ok()).toBeTruthy();
    expect(joinPlayer1Response.status()).toBe(201);
    const player1 = await joinPlayer1Response.json();
    expect(player1.playerId).toBeDefined();
    expect(player1.sessionId).toBe(session.id);
    expect(player1.nickname).toBe('PlayerOne');
    console.log('✓ Player 1 joined session');

    // Step 8: Join session as Player 2
    const joinPlayer2Response = await request.post('/api/sessions/join', {
      data: {
        pin: session.pin,
        nickname: 'PlayerTwo',
      },
    });
    expect(joinPlayer2Response.ok()).toBeTruthy();
    const player2 = await joinPlayer2Response.json();
    expect(player2.playerId).toBeDefined();
    expect(player2.nickname).toBe('PlayerTwo');
    console.log('✓ Player 2 joined session');

    // Step 9: Try to join with duplicate nickname (should fail)
    const duplicateResponse = await request.post('/api/sessions/join', {
      data: {
        pin: session.pin,
        nickname: 'PlayerOne',
      },
    });
    expect(duplicateResponse.status()).toBe(400);
    const duplicateError = await duplicateResponse.json();
    expect(duplicateError.error).toContain('already taken');
    console.log('✓ Duplicate nickname correctly rejected');

    // Step 10: Try to join with invalid PIN (should fail)
    const invalidPinResponse = await request.post('/api/sessions/join', {
      data: {
        pin: '999999',
        nickname: 'PlayerThree',
      },
    });
    expect(invalidPinResponse.status()).toBe(404);
    console.log('✓ Invalid PIN correctly rejected');

    // Step 11: List players in session
    const playersResponse = await request.get(`/api/sessions/${session.id}/players`);
    expect(playersResponse.ok()).toBeTruthy();
    const playersData = await playersResponse.json();
    expect(playersData.players).toBeDefined();
    expect(playersData.players.length).toBe(2);
    expect(playersData.players.some((p: any) => p.nickname === 'PlayerOne')).toBeTruthy();
    expect(playersData.players.some((p: any) => p.nickname === 'PlayerTwo')).toBeTruthy();
    console.log(`✓ Listed ${playersData.players.length} players in session`);

    // Step 12: Delete session
    const deleteResponse = await request.delete(`/api/sessions/${session.id}`, {
      headers: {
        'X-Host-Token': session.hostToken,
      },
    });
    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData.message).toContain('deleted');
    console.log('✓ Session deleted successfully');

    // Step 13: Verify session is deleted
    const verifyDeleteResponse = await request.get(`/api/sessions/${session.id}`, {
      headers: {
        'X-Host-Token': session.hostToken,
      },
    });
    expect(verifyDeleteResponse.status()).toBe(404);
    console.log('✓ Verified session no longer exists');

    // Step 14: Verify players are also deleted (cascade)
    const verifyPlayersResponse = await request.get(`/api/sessions/${session.id}/players`);
    expect(verifyPlayersResponse.status()).toBe(404);
    console.log('✓ Verified players were cascade deleted');
  });

  test('multiple sessions can coexist', async ({ request }) => {
    // Create first session
    const session1Response = await request.post('/api/sessions', {
      data: { questionBankId: 'sample-general-knowledge' },
    });
    expect(session1Response.status()).toBe(201);
    const session1 = await session1Response.json();

    // Create second session
    const session2Response = await request.post('/api/sessions', {
      data: { questionBankId: 'sample-general-knowledge' },
    });
    expect(session2Response.status()).toBe(201);
    const session2 = await session2Response.json();

    // Verify different PINs
    expect(session1.pin).not.toBe(session2.pin);
    expect(session1.id).not.toBe(session2.id);
    console.log(`✓ Created 2 distinct sessions with PINs: ${session1.pin}, ${session2.pin}`);

    // Players can join different sessions
    await request.post('/api/sessions/join', {
      data: { pin: session1.pin, nickname: 'Alice' },
    });

    await request.post('/api/sessions/join', {
      data: { pin: session2.pin, nickname: 'Alice' }, // Same nickname but different session
    });

    // Verify players are in correct sessions
    const players1Response = await request.get(`/api/sessions/${session1.id}/players`);
    const players1 = await players1Response.json();
    expect(players1.players.length).toBe(1);

    const players2Response = await request.get(`/api/sessions/${session2.id}/players`);
    const players2 = await players2Response.json();
    expect(players2.players.length).toBe(1);

    console.log('✓ Players correctly isolated between sessions');

    // Cleanup
    await request.delete(`/api/sessions/${session1.id}`, {
      headers: { 'X-Host-Token': session1.hostToken },
    });
    await request.delete(`/api/sessions/${session2.id}`, {
      headers: { 'X-Host-Token': session2.hostToken },
    });
});

  test('complete game flow - lobby to finished', async ({ request }) => {
    // Create session and join players
    const createResponse = await request.post('/api/sessions', {
      data: { questionBankId: 'sample-general-knowledge' },
    });
    expect(createResponse.status()).toBe(201);
    const session = await createResponse.json();

    const player1Response = await request.post('/api/sessions/join', {
      data: { pin: session.pin, nickname: 'Alice' },
    });
    const player1 = await player1Response.json();

    const player2Response = await request.post('/api/sessions/join', {
      data: { pin: session.pin, nickname: 'Bob' },
    });
    const player2 = await player2Response.json();

    console.log(`✓ Session created with 2 players (PIN: ${session.pin})`);

    // Players check initial game state (lobby)
    const initialStateResponse = await request.get(`/api/sessions/${session.id}/state`, {
      headers: { 'X-Player-Id': player1.playerId },
    });
    expect(initialStateResponse.ok()).toBeTruthy();
    const initialState = await initialStateResponse.json();
    expect(initialState.status).toBe('lobby');
    expect(initialState.currentQuestion).toBeNull();
    expect(initialState.currentQuestionNumber).toBe(0);
    expect(initialState.totalQuestions).toBeGreaterThan(0);
    console.log(`✓ Initial lobby state verified (${initialState.totalQuestions} questions)`);

    // Check initial leaderboard (empty scores)
    const initialLeaderboardResponse = await request.get(`/api/sessions/${session.id}/leaderboard`);
    expect(initialLeaderboardResponse.ok()).toBeTruthy();
    const initialLeaderboard = await initialLeaderboardResponse.json();
    expect(initialLeaderboard.leaderboard).toHaveLength(2);
    expect(initialLeaderboard.leaderboard.every((p: any) => p.score === 0)).toBeTruthy();
    console.log('✓ Initial leaderboard shows zero scores');

    // Host starts the quiz
    const startResponse = await request.post(`/api/sessions/${session.id}/start`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    expect(startResponse.ok()).toBeTruthy();
    const startData = await startResponse.json();
    expect(startData.message).toBe('Quiz started');
    expect(startData.currentQuestionIndex).toBe(0);
    console.log('✓ Quiz started successfully');

    // Players check game state after start (playing)
    const playingStateResponse = await request.get(`/api/sessions/${session.id}/state`, {
      headers: { 'X-Player-Id': player1.playerId },
    });
    expect(playingStateResponse.ok()).toBeTruthy();
    const playingState = await playingStateResponse.json();
    expect(playingState.status).toBe('playing');
    expect(playingState.currentQuestion).toBeTruthy();
    expect(playingState.currentQuestionNumber).toBe(1);
    expect(playingState.timeLimit).toBeGreaterThan(0);
    expect(playingState.currentQuestion.answers).toBeDefined();
    
    const firstQuestion = playingState.currentQuestion;
    console.log(`✓ First question loaded: "${firstQuestion.text.substring(0, 50)}..."`);

    // Player 1 submits correct answer (assuming first correct answer)
    const correctAnswerId = firstQuestion.correctAnswerIds?.[0] || firstQuestion.answers[0].id;
    const answer1Response = await request.post(`/api/sessions/${session.id}/answer`, {
      headers: { 
        'X-Player-Id': player1.playerId,
        'Content-Type': 'application/json'
      },
      data: {
        questionId: firstQuestion.id,
        selectedAnswerIds: [correctAnswerId],
      },
    });
    expect(answer1Response.ok()).toBeTruthy();
    const answer1Data = await answer1Response.json();
    expect(answer1Data.score).toBeGreaterThanOrEqual(0);
    console.log(`✓ Player 1 submitted answer (score: ${answer1Data.score})`);

    // Player 2 submits wrong answer
    const wrongAnswerId = firstQuestion.answers.find((a: any) => a.id !== correctAnswerId)?.id || firstQuestion.answers[1].id;
    const answer2Response = await request.post(`/api/sessions/${session.id}/answer`, {
      headers: { 
        'X-Player-Id': player2.playerId,
        'Content-Type': 'application/json'
      },
      data: {
        questionId: firstQuestion.id,
        selectedAnswerIds: [wrongAnswerId],
      },
    });
    expect(answer2Response.ok()).toBeTruthy();
    const answer2Data = await answer2Response.json();
    console.log(`✓ Player 2 submitted answer (score: ${answer2Data.score})`);

    // Check leaderboard after first question
    const leaderboardResponse = await request.get(`/api/sessions/${session.id}/leaderboard`);
    expect(leaderboardResponse.ok()).toBeTruthy();
    const leaderboard = await leaderboardResponse.json();
    expect(leaderboard.leaderboard).toHaveLength(2);
    const topPlayer = leaderboard.leaderboard[0];
    console.log(`✓ Leaderboard updated - ${topPlayer.nickname} leads with ${topPlayer.score} points`);

    // Try to submit duplicate answer (should fail)
    const duplicateAnswerResponse = await request.post(`/api/sessions/${session.id}/answer`, {
      headers: { 
        'X-Player-Id': player1.playerId,
        'Content-Type': 'application/json'
      },
      data: {
        questionId: firstQuestion.id,
        selectedAnswerIds: [correctAnswerId],
      },
    });
    expect(duplicateAnswerResponse.status()).toBe(400);
    console.log('✓ Duplicate answer submission correctly rejected');

    // Host moves to next question
    const nextResponse = await request.post(`/api/sessions/${session.id}/next`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    expect(nextResponse.ok()).toBeTruthy();
    const nextData = await nextResponse.json();

    if (nextData.status === 'finished') {
      console.log('✓ Quiz finished (only 1 question in bank)');
    } else {
      expect(nextData.message).toBe('Moved to next question');
      expect(nextData.currentQuestionIndex).toBe(1);
      console.log(`✓ Moved to question ${nextData.currentQuestionIndex + 1}`); // POST /next returns currentQuestionIndex

      // Verify new question state
      const newStateResponse = await request.get(`/api/sessions/${session.id}/state`, {
        headers: { 'X-Player-Id': player1.playerId },
      });
      const newState = await newStateResponse.json();
      expect(newState.currentQuestionNumber).toBe(2);
      expect(newState.currentQuestion.id).not.toBe(firstQuestion.id);
      console.log('✓ New question loaded successfully');

      // Host ends quiz early
      const endResponse = await request.post(`/api/sessions/${session.id}/end`, {
        headers: { 'X-Host-Token': session.hostToken },
      });
      expect(endResponse.ok()).toBeTruthy();
      const endData = await endResponse.json();
      expect(endData.message).toBe('Quiz ended');
      console.log('✓ Quiz ended by host');
    }

    // Check final state
    const finalStateResponse = await request.get(`/api/sessions/${session.id}/state`, {
      headers: { 'X-Player-Id': player1.playerId },
    });
    const finalState = await finalStateResponse.json();
    expect(finalState.status).toBe('finished');
    expect(finalState.currentQuestion).toBeNull();
    console.log('✓ Final state confirmed as finished');

    // Check final leaderboard
    const finalLeaderboardResponse = await request.get(`/api/sessions/${session.id}/leaderboard`);
    const finalLeaderboard = await finalLeaderboardResponse.json();
    expect(finalLeaderboard.leaderboard).toHaveLength(2);
    console.log('✓ Final leaderboard retrieved');

    // Cleanup
    await request.delete(`/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    console.log('✓ Session cleanup completed');
  });

  test('game flow edge cases and validation', async ({ request }) => {
    const createResponse = await request.post('/api/sessions', {
      data: { questionBankId: 'sample-general-knowledge' },
    });
    const session = await createResponse.json();

    const playerResponse = await request.post('/api/sessions/join', {
      data: { pin: session.pin, nickname: 'TestPlayer' },
    });
    const player = await playerResponse.json();

    // Try to answer before quiz starts (should fail)
    const prematureAnswerResponse = await request.post(`/api/sessions/${session.id}/answer`, {
      headers: { 
        'X-Player-Id': player.playerId,
        'Content-Type': 'application/json'
      },
      data: { questionId: 'fake-question', selectedAnswerIds: ['answer1'] },
    });
    expect(prematureAnswerResponse.status()).toBe(400);
    console.log('✓ Answer before start correctly rejected');

    // Try to start quiz twice (should fail second time)
    await request.post(`/api/sessions/${session.id}/start`, {
      headers: { 'X-Host-Token': session.hostToken },
    });

    const secondStartResponse = await request.post(`/api/sessions/${session.id}/start`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    expect(secondStartResponse.status()).toBe(400);
    console.log('✓ Double start correctly rejected');

    // Try to end already finished quiz
    const endResponse = await request.post(`/api/sessions/${session.id}/end`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    expect(endResponse.ok()).toBeTruthy();

    const secondEndResponse = await request.post(`/api/sessions/${session.id}/end`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    expect(secondEndResponse.status()).toBe(400);
    console.log('✓ Double end correctly rejected');

    // Try unauthorized operations
    const unauthorizedStartResponse = await request.post(`/api/sessions/${session.id}/start`, {
      headers: { 'X-Host-Token': 'invalid-token' },
    });
    expect(unauthorizedStartResponse.status()).toBe(403);

    const unauthorizedStateResponse = await request.get(`/api/sessions/${session.id}/state`, {
      headers: { 'X-Player-Id': 'invalid-player' },
    });
    expect(unauthorizedStateResponse.status()).toBe(403);

    console.log('✓ Unauthorized operations correctly rejected');

    // Cleanup
    await request.delete(`/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
  });
});
