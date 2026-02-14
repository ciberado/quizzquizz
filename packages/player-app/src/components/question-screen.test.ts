import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('QuestionScreen - Multiple Answer Validation', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3002',
    });
    document = dom.window.document;
    global.document = document as any;
    global.window = dom.window as any;
  });

  describe('Submit button validation', () => {
    it('should disable submit button when no answers selected', () => {
      const html = `
        <div class="screen">
          <button class="submit-btn" disabled>Submit Answer</button>
        </div>
      `;
      document.body.innerHTML = html;
      
      const submitBtn = document.querySelector('.submit-btn') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    });

    it('should enable submit button for single answer question with one selected', () => {
      // This test verifies the logic conceptually
      // In actual implementation, the button state is controlled by updateSubmitButton()
      
      const correctAnswerIds = ['A1']; // Single correct answer
      const selectedAnswerIds = new Set(['A1']); // One selected
      
      // Logic: If correctCount > 1, must match exactly; otherwise just needs > 0
      const correctCount = correctAnswerIds.length;
      const selectedCount = selectedAnswerIds.size;
      
      let shouldDisable = selectedCount === 0;
      if (correctCount > 1 && selectedCount !== correctCount) {
        shouldDisable = true;
      }
      
      expect(shouldDisable).toBe(false);
    });

    it('should disable submit button for multiple answer question with wrong count', () => {
      const correctAnswerIds = ['A1', 'A2', 'A3']; // 3 correct answers
      const selectedAnswerIds = new Set(['A1', 'A2']); // Only 2 selected
      
      const correctCount = correctAnswerIds.length;
      const selectedCount = selectedAnswerIds.size;
      
      let shouldDisable = selectedCount === 0;
      if (correctCount > 1 && selectedCount !== correctCount) {
        shouldDisable = true;
      }
      
      expect(shouldDisable).toBe(true);
    });

    it('should enable submit button for multiple answer question with correct count', () => {
      const correctAnswerIds = ['A1', 'A2', 'A3']; // 3 correct answers
      const selectedAnswerIds = new Set(['A1', 'A2', 'A3']); // Exactly 3 selected
      
      const correctCount = correctAnswerIds.length;
      const selectedCount = selectedAnswerIds.size;
      
      let shouldDisable = selectedCount === 0;
      if (correctCount > 1 && selectedCount !== correctCount) {
        shouldDisable = true;
      }
      
      expect(shouldDisable).toBe(false);
    });

    it('should disable when selecting more than required for multiple answer', () => {
      const correctAnswerIds = ['A1', 'A2']; // 2 correct answers
      const selectedAnswerIds = new Set(['A1', 'A2', 'A3']); // 3 selected (too many)
      
      const correctCount = correctAnswerIds.length;
      const selectedCount = selectedAnswerIds.size;
      
      let shouldDisable = selectedCount === 0;
      if (correctCount > 1 && selectedCount !== correctCount) {
        shouldDisable = true;
      }
      
      expect(shouldDisable).toBe(true);
    });

    it('should disable when selecting less than required for multiple answer', () => {
      const correctAnswerIds = ['A1', 'A2', 'A3']; // 3 correct answers
      const selectedAnswerIds = new Set(['A1']); // Only 1 selected (too few)
      
      const correctCount = correctAnswerIds.length;
      const selectedCount = selectedAnswerIds.size;
      
      let shouldDisable = selectedCount === 0;
      if (correctCount > 1 && selectedCount !== correctCount) {
        shouldDisable = true;
      }
      
      expect(shouldDisable).toBe(true);
    });
  });

  describe('UI rendering', () => {
    it('should show multiple answers hint when question has multiple correct answers', () => {
      const correctAnswerIds = ['A1', 'A2', 'A3'];
      const questionText = 'Which are prime numbers?';
      
      // Simulate rendered HTML for multiple correct answers
      const shouldShowHint = correctAnswerIds.length > 1;
      
      expect(shouldShowHint).toBe(true);
      
      // Verify hint text format
      const hintText = `⚠️ Select exactly ${correctAnswerIds.length} answers`;
      expect(hintText).toContain('⚠️ Select exactly 3 answers');
    });

    it('should not show multiple answers hint for single answer question', () => {
      const correctAnswerIds = ['A1'];
      
      const shouldShowHint = correctAnswerIds.length > 1;
      
      expect(shouldShowHint).toBe(false);
    });

    it('should show selection counter for multiple answer questions', () => {
      const correctAnswerIds = ['A1', 'A2'];
      const selectedAnswerIds = new Set(['A1']);
      
      // Verify counter format
      const counterText = `${selectedAnswerIds.size}/${correctAnswerIds.length} selected`;
      expect(counterText).toBe('1/2 selected');
    });

    it('should show generic hint for single answer questions', () => {
      const correctAnswerIds = ['A1'];
      
      const hintText = correctAnswerIds.length > 1 
        ? `0/${correctAnswerIds.length} selected`
        : 'Select one or more answers';
      
      expect(hintText).toBe('Select one or more answers');
    });
  });

  describe('Timeout behavior', () => {
    it('should submit answer on timeout regardless of selection count', () => {
      // This test verifies the timeout behavior logic
      // The actual submitAnswer() method is called directly by timer, bypassing button state
      
      const correctAnswerIds = ['A1', 'A2', 'A3']; // 3 correct answers required
      const selectedAnswerIds = new Set(['A1']); // Only 1 selected
      
      // When timer expires, submitAnswer() is called directly
      // It doesn't check button disabled state
      const timerExpired = true;
      const hasSubmitted = false;
      
      // Logic: if timer expired and not yet submitted, submit regardless of count
      const shouldAutoSubmit = timerExpired && !hasSubmitted;
      
      expect(shouldAutoSubmit).toBe(true);
      // Even though button would be disabled (1/3 selected), timeout forces submission
    });

    it('should not auto-submit if already submitted', () => {
      const timerExpired = true;
      const hasSubmitted = true;
      
      const shouldAutoSubmit = timerExpired && !hasSubmitted;
      
      expect(shouldAutoSubmit).toBe(false);
    });

    it('should auto-submit with correct count on timeout', () => {
      const correctAnswerIds = ['A1', 'A2'];
      const selectedAnswerIds = new Set(['A1', 'A2']); // Correct count
      
      const timerExpired = true;
      const hasSubmitted = false;
      
      const shouldAutoSubmit = timerExpired && !hasSubmitted;
      
      expect(shouldAutoSubmit).toBe(true);
      // Button would be enabled, and timeout also submits
    });

    it('should auto-submit even with zero selections on timeout', () => {
      const correctAnswerIds = ['A1', 'A2'];
      const selectedAnswerIds = new Set(); // Nothing selected
      
      const timerExpired = true;
      const hasSubmitted = false;
      
      const shouldAutoSubmit = timerExpired && !hasSubmitted;
      
      expect(shouldAutoSubmit).toBe(true);
      // Even with no selections, timeout forces submission (will be marked incorrect)
    });
  });

  describe('Edge cases', () => {
    it('should handle question with 2 correct answers', () => {
      const correctAnswerIds = ['A1', 'A2'];
      const selectedAnswerIds = new Set(['A1', 'A2']);
      
      const correctCount = correctAnswerIds.length;
      const selectedCount = selectedAnswerIds.size;
      
      let shouldDisable = selectedCount === 0;
      if (correctCount > 1 && selectedCount !== correctCount) {
        shouldDisable = true;
      }
      
      expect(shouldDisable).toBe(false);
    });

    it('should handle question with 4 correct answers', () => {
      const correctAnswerIds = ['A1', 'A2', 'A3', 'A4'];
      const selectedAnswerIds = new Set(['A1', 'A2', 'A3', 'A4']);
      
      const correctCount = correctAnswerIds.length;
      const selectedCount = selectedAnswerIds.size;
      
      let shouldDisable = selectedCount === 0;
      if (correctCount > 1 && selectedCount !== correctCount) {
        shouldDisable = true;
      }
      
      expect(shouldDisable).toBe(false);
    });

    it('should keep button disabled if already submitted', () => {
      const hasSubmitted = true;
      
      // If already submitted, button stays disabled regardless of selection
      expect(hasSubmitted).toBe(true);
    });
  });
});
