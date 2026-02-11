/**
 * Error handling utilities for common API error scenarios
 */

import { ApiError } from './api-client';
import { router } from './router';
import { state } from './state';

/**
 * Handle common API errors with appropriate user feedback and navigation
 */
export function handleApiError(error: unknown, context: string = 'API request'): boolean {
  console.error(`[${context}] Error:`, error);

  // Handle ApiError instances
  if (error instanceof ApiError) {
    switch (error.status) {
      case 0:
        // Network error - already handled by retry logic, just log
        console.warn('Network error - will retry automatically');
        return false; // Don't take action, let retry logic handle it

      case 404:
        // Session not found
        showErrorToast('Quiz not found or has ended');
        setTimeout(() => {
          state.clearState();
          router.navigate('/');
        }, 2000);
        return true;

      case 401:
      case 403:
        // Unauthorized - invalid host token or session expired
        showErrorToast('Session expired. Please create a new quiz.');
        setTimeout(() => {
          state.clearState();
          router.navigate('/');
        }, 2000);
        return true;

      case 409: {
        // Conflict - usually duplicate action
        const conflictData = error.data as { error?: string };
        showErrorToast(conflictData?.error || 'Action already completed');
        return true;
      }

      case 429:
        // Rate limited
        showErrorToast('Too many requests. Please wait a moment.');
        return true;

      case 500:
      case 502:
      case 503:
        // Server error
        showErrorToast('Server error. Please try again.');
        return false; // Allow retry

      default: {
        // Unknown error
        const data = error.data as { error?: string };
        showErrorToast(data?.error || 'An error occurred');
        return false;
      }
    }
  }

  // Unknown error type
  showErrorToast('An unexpected error occurred');
  return false;
}

/**
 * Show a temporary error message to the user
 */
function showErrorToast(message: string, duration: number = 3000): void {
  // Check if toast container exists
  let container = document.querySelector('.error-toast-container') as HTMLDivElement;
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'error-toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.innerHTML = `
    <span class="error-toast-icon">⚠️</span>
    <span class="error-toast-message">${escapeHtml(message)}</span>
  `;

  // Add to container
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('visible'), 10);

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if error should trigger a session end
 */
export function isSessionEndError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 404 || error.status === 401 || error.status === 403;
  }
  return false;
}

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as { error?: string };
    return data?.error || error.message || 'An error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}
