import { test, expect } from '@playwright/test';

/**
 * Host Question Analytics Dashboard E2E Test
 * Tests the question statistics table on the final results screen
 */

test.describe('Host Question Analytics Dashboard', () => {
  test('should display question statistics with sorting and expandable details', async ({ page, request }) => {
    // Configure host app base URL
    const HOST_APP_URL = 'http://localhost:3001';
    
    // Step 1: Create a session via API
    const banksResponse = await request.get('/api/question-banks');
    const banks = await banksResponse.json();
    const questionBank = banks.questionBanks[0];

    const createSessionResponse = await request.post('/api/sessions', {
      data: { questionBankId: questionBank.id },
    });
    const session = await createSessionResponse.json();
    console.log(`✓ Created session with PIN: ${session.pin}`);

    // Step 2: Navigate to host app
    await page.goto(HOST_APP_URL);
    await page.waitForLoadState('networkidle');

    // Step 3: Create session in UI (simulating host flow)
    // We'll use the API-created session by navigating directly to lobby
    await page.goto(`${HOST_APP_URL}/#/lobby/${session.id}`);
    
    // Set session state in localStorage (using correct key!)
    await page.evaluate(({ sessionId, hostToken }) => {
      const state = {
        sessionId,
        hostToken,
        pin: '',
        questionBankId: '',
      };
      localStorage.setItem('quizzquizz_host_state', JSON.stringify(state));
    }, { sessionId: session.id, hostToken: session.hostToken });

    // Reload to apply state
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 4: Add 3 players via API
    const players = [];
    for (let i = 0; i < 3; i++) {
      const joinResponse = await request.post('/api/sessions/join', {
        data: { 
          pin: session.pin,
          nickname: `Player${i + 1}`,
        },
      });
      
      // Check if response is ok
      if (!joinResponse.ok()) {
        const errorText = await joinResponse.text();
        console.error(`Failed to join player ${i + 1}: ${errorText}`);
        throw new Error(`Failed to join player ${i + 1}: ${joinResponse.status()}`);
      }
      
      const player = await joinResponse.json();
      players.push(player);
      console.log(`✓ Player ${i + 1} joined`);
    }

    // Wait a bit for lobby to update
    await page.waitForTimeout(1000);

    // Step 5: Start the quiz via API
    await request.post(`/api/sessions/${session.id}/start`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    console.log('✓ Quiz started');

    // Navigate to question screen
    await page.goto(`${HOST_APP_URL}/#/question/${session.id}`);
    await page.waitForLoadState('networkidle');
    
    // Get session details to know questions
    const sessionDetails = await request.get(`/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    const sessionData = await sessionDetails.json();
    const questions = sessionData.questions;
    
    // Step 6: Answer only the first question (Q001 - Capital of France)
    // Player 1: Correct answer
    // Player 2: Correct answer  
    // Player 3: Incorrect answer
    // Expected stats: 3 total, 2 correct, 1 incorrect, 67% accuracy
    
    const q1 = questions[0];
    const correctAnswer = q1.correctAnswerIds[0];
    const incorrectAnswer = q1.answers.find((a: any) => !q1.correctAnswerIds.includes(a.id))?.id;

    console.log(`Answering Q1: ID=${q1.id}, Correct=${correctAnswer}, Incorrect=${incorrectAnswer}`);

    // Player 1: correct
    await request.post(`/api/sessions/${session.id}/answer`, {
      headers: { 'X-Player-Id': players[0].playerId },
      data: {
        questionId: q1.id,
        selectedAnswerIds: [correctAnswer],
      },
    });

    // Player 2: correct
    await request.post(`/api/sessions/${session.id}/answer`, {
      headers: { 'X-Player-Id': players[1].playerId },
      data: {
        questionId: q1.id,
        selectedAnswerIds: [correctAnswer],
      },
    });

    // Player 3: incorrect
    await request.post(`/api/sessions/${session.id}/answer`, {
      headers: { 'X-Player-Id': players[2].playerId },
      data: {
        questionId: q1.id,
        selectedAnswerIds: [incorrectAnswer],
      },
    });

    console.log('✓ All players answered Q1');

    // Step 7: End the quiz
    await request.post(`/api/sessions/${session.id}/end`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    console.log('✓ Quiz ended');

    // Step 8: Re-set session state before navigating to final results
    await page.goto(`${HOST_APP_URL}`);
    await page.evaluate(({ sessionId, hostToken, pin, questionBankId }) => {
      const state = {
        sessionId,
        hostToken,
        pin,
        questionBankId,
      };
      localStorage.setItem('quizzquizz_host_state', JSON.stringify(state));
      console.log('Set state in localStorage:', state);
    }, { sessionId: session.id, hostToken: session.hostToken, pin: session.pin, questionBankId: questionBank.id });

    // Step 9: Navigate to final results (with hash for routing)
    await page.goto(`${HOST_APP_URL}/#/results`);
    await page.waitForTimeout(2000); // Give router time to process

    // Step 10: Verify final results screen loaded
    await expect(page.locator('h1')).toContainText('Quiz Complete');
    console.log('✓ Final results screen loaded');

    // Step 11: Verify question statistics table exists
    const statsTable = page.locator('question-stats-table');
    await expect(statsTable).toBeVisible();
    console.log('✓ Question statistics table is visible');

    // Step 11: Verify table header
    await expect(page.locator('.stats-header h2')).toContainText('Question Performance');
    console.log('✓ Table header shows "Question Performance"');

    // Step 12: Verify sort controls exist
    const orderButton = page.locator('.sort-btn[data-sort="order"]');
    const accuracyButton = page.locator('.sort-btn[data-sort="accuracy"]');
    await expect(orderButton).toBeVisible();
    await expect(accuracyButton).toBeVisible();
    console.log('✓ Sort buttons are visible');

    // Step 13: Verify default sort is "Order"
    await expect(orderButton).toHaveClass(/active/);
    console.log('✓ Default sort is "Order"');

    // Step 14: Verify table has rows for ALL questions in the bank (even unanswered ones)
    const questionRows = page.locator('.question-row');
    const rowCount = await questionRows.count();
    expect(rowCount).toBe(questions.length); // All questions in the bank
    console.log(`✓ Table shows ${rowCount} question rows (all questions in bank)`);

    // Step 15: Verify first question statistics (Q1: 2 correct, 1 incorrect = 67% accuracy)
    const firstRow = questionRows.nth(0);
    await expect(firstRow.locator('.q-number')).toContainText('1');
    await expect(firstRow.locator('.q-total')).toContainText('3'); // total answers
    await expect(firstRow.locator('.q-correct')).toContainText('2'); // correct
    await expect(firstRow.locator('.q-incorrect')).toContainText('1'); // incorrect
    await expect(firstRow.locator('.q-accuracy .percentage')).toContainText('67%'); // accuracy
    console.log('✓ Question 1 stats: 3 total, 2 correct, 1 incorrect, 67% accuracy');

    // Step 16: Verify unanswered question (Q2) shows 0 stats
    const secondRow = questionRows.nth(1);
    await expect(secondRow.locator('.q-number')).toContainText('2');
    await expect(secondRow.locator('.q-total')).toContainText('0'); // unanswered
    await expect(secondRow.locator('.q-accuracy .percentage')).toContainText('0%');
    console.log('✓ Question 2 (unanswered) shows 0 stats');

   // Step 17: Test sorting by accuracy
    await accuracyButton.click();
    await page.waitForTimeout(200);
    await expect(accuracyButton).toHaveClass(/active/);
    await expect(orderButton).not.toHaveClass(/active/);
    console.log('✓ Switched to "Accuracy" sort');

    // After sorting by accuracy, Q1 (67%) should be first, Q2 (33%) should be second
    const sortedFirstRow = questionRows.nth(0);
    await expect(sortedFirstRow.locator('.q-accuracy .percentage')).toContainText('67%');
    console.log('✓ Accuracy sort working: higher accuracy (67%) shown first');

    // Step 18: Switch back to order sort
    await orderButton.click();
    await page.waitForTimeout(200);
    await expect(orderButton).toHaveClass(/active/);
    console.log('✓ Switched back to "Order" sort');

    // Step 19: Test expandable details - click first question row
    const expandIcon = firstRow.locator('.expand-icon');
    await expect(expandIcon).toContainText('▶');
    await firstRow.click();
    await page.waitForTimeout(200);
    
    // Verify row is expanded
    await expect(firstRow).toHaveClass(/expanded/);
    await expect(expandIcon).toContainText('▼');
    console.log('✓ Question row expanded');

    // Step 20: Verify details panel is visible
    const detailsRow = page.locator('.question-details').first();
    await expect(detailsRow).toBeVisible();
    console.log('✓ Details panel is visible');

    // Step 21: Verify details panel contains full question text
    await expect(detailsRow.locator('.details-content')).toContainText('Full Question');
    console.log('✓ Details panel shows full question label');

    // Step 22: Verify difficulty badge exists
    const difficultyBadge = detailsRow.locator('.difficulty-badge');
    await expect(difficultyBadge).toBeVisible();
    console.log('✓ Difficulty badge is visible');

    // Step 23: Verify stats summary in details (compact horizontal layout)
    const statsSummary = detailsRow.locator('.stats-summary-compact');
    await expect(statsSummary).toBeVisible();
    await expect(statsSummary).toContainText('Total: 3');
    await expect(statsSummary).toContainText('Correct: 2');
    await expect(statsSummary).toContainText('Incorrect: 1');
    await expect(statsSummary).toContainText('Accuracy: 67%');
    console.log('✓ Stats summary shows correct data in compact format');

    // Step 23a: Verify answer options display with percentages
    const answerOptions = detailsRow.locator('.answer-option');
    const optionCount = await answerOptions.count();
    expect(optionCount).toBeGreaterThan(0);
    
    // Check first answer option has percentage and highlight
    const firstOption = answerOptions.first();
    await expect(firstOption).toBeVisible();
    await expect(firstOption.locator('.answer-percentage')).toBeVisible();
    console.log('✓ Answer options display with percentages');

    // Step 24: Collapse details - click again
    await firstRow.click();
    await page.waitForTimeout(200);
    await expect(firstRow).not.toHaveClass(/expanded/);
    await expect(detailsRow).not.toBeVisible();
    console.log('✓ Question row collapsed');

    // Step 25: Verify accuracy bar visualization
    const accuracyBar = firstRow.locator('.accuracy-fill');
    await expect(accuracyBar).toBeVisible();
    
    // Check that the width is approximately 67%
    const barWidth = await accuracyBar.evaluate((el: HTMLElement) => el.style.width);
    expect(barWidth).toBe('67%');
    console.log('✓ Accuracy bar width matches percentage (67%)');

    // Step 26: Verify accuracy color coding (67% should be orange, between 50-75%)
    const accuracyColor = await firstRow.locator('.accuracy-fill').evaluate((el: HTMLElement) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // Orange is rgb(255, 152, 0) or #ff9800
    expect(accuracyColor).toContain('255, 152, 0'); // rgb format
    console.log('✓ Accuracy bar color is orange (50-75% range)');

    // Step 27: Verify low accuracy color (Q2 with 33% should be red)
    const secondAccuracyColor = await secondRow.locator('.accuracy-fill').evaluate((el: HTMLElement) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // Red is rgb(244, 67, 54) or #f44336
    expect(secondAccuracyColor).toContain('244, 67, 54'); // rgb format
    console.log('✓ Low accuracy bar color is red (<50% range)');

    console.log('\n✅ All question analytics dashboard tests passed!');
  });
});
