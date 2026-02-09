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
});
