import { BaseComponent } from './base-component';
import { router } from '../router';
import { state } from '../state';

/**
 * Join screen - PIN entry to join a quiz
 */
export class JoinScreen extends BaseComponent {
  private pinInput: HTMLInputElement | null = null;
  private submitButton: HTMLButtonElement | null = null;
  private errorMessage: HTMLDivElement | null = null;
  private isSubmitting = false;

  protected onMount(): void {
    // Initialize after render
  }

  protected onUnmount(): void {
    // Cleanup if needed
  }

  protected render(): void {
    this.setContent(`
      <div class="screen">
        <div class="card">
          <h1>Join Quiz</h1>
          <p>Enter the 6-digit PIN from your host's screen</p>
          
          <form id="join-form">
            <input
              type="text"
              id="pin-input"
              placeholder="000000"
              maxlength="6"
              pattern="[0-9]{6}"
              autocomplete="off"
              inputmode="numeric"
              required
            />
            
            <button type="submit" id="submit-button">
              Join Quiz
            </button>
            
            <div id="error-message" class="error-message" style="display: none;"></div>
          </form>
        </div>
      </div>
    `);

    // Cache DOM elements
    this.pinInput = this.qs<HTMLInputElement>('#pin-input');
    this.submitButton = this.qs<HTMLButtonElement>('#submit-button');
    this.errorMessage = this.qs<HTMLDivElement>('#error-message');

    // Set up event listeners
    this.setupEventListeners();

    // Focus the input
    this.pinInput?.focus();
  }

  private setupEventListeners(): void {
    const form = this.qs<HTMLFormElement>('#join-form');
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // Auto-format PIN input (numbers only)
    if (this.pinInput) {
      this.pinInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        target.value = target.value.replace(/[^0-9]/g, '');
      });
    }
  }

  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return;

    const pin = this.pinInput?.value.trim();

    // Validate PIN
    if (!pin || pin.length !== 6) {
      this.showError('Please enter a 6-digit PIN');
      return;
    }

    this.isSubmitting = true;
    this.setLoading(true);
    this.hideError();

    try {
      // Store PIN temporarily in state (will be used in nickname screen)
      state.setState({ sessionId: null, playerId: null });
      
      // Navigate to nickname screen with PIN in query
      router.navigate(`/nickname?pin=${pin}`);
    } catch (error) {
      this.showError('Failed to validate PIN. Please try again.');
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    if (this.submitButton) {
      this.submitButton.disabled = loading;
      if (loading) {
        this.submitButton.classList.add('loading');
        this.submitButton.textContent = 'Joining...';
      } else {
        this.submitButton.classList.remove('loading');
        this.submitButton.textContent = 'Join Quiz';
      }
    }
    if (this.pinInput) {
      this.pinInput.disabled = loading;
    }
  }

  private showError(message: string): void {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';
    }
  }

  private hideError(): void {
    if (this.errorMessage) {
      this.errorMessage.style.display = 'none';
    }
  }
}

// Register custom element
customElements.define('join-screen', JoinScreen);
