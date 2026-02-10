/**
 * Success notification utility
 * Shows positive feedback for successful actions
 */

/**
 * Show a temporary success message to the user
 */
export function showSuccessToast(message: string, duration: number = 2000): void {
  // Check if toast container exists
  let container = document.querySelector('.success-toast-container') as HTMLDivElement;
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'success-toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.innerHTML = `
    <span class="success-toast-icon">✓</span>
    <span class="success-toast-message">${escapeHtml(message)}</span>
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
