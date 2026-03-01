import { BaseComponent } from './base-component';
import { api, ApiError } from '../api-client';
import { router } from '../router';
import { state } from '../state';

/**
 * Nickname screen - Enter player name before joining
 */
export class NicknameScreen extends BaseComponent {
  private nicknameInput: HTMLInputElement | null = null;
  private submitButton: HTMLButtonElement | null = null;
  private errorMessage: HTMLDivElement | null = null;
  private isSubmitting = false;
  private pin = '';

  protected async onMount(): Promise<void> {
    // Extract PIN from URL query params
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    this.pin = params.get('pin') || '';

    if (!this.pin || this.pin.length !== 6) {
      // No valid PIN, go back to join screen
      router.navigate('/join');
      return;
    }

    // Check if user is already authenticated — skip nickname prompt if so
    try {
      const authSession = await api.getAuthSession();
      const user = authSession?.user;
      if (user?.name) {
        // Auto-join with the user's registered name
        this.autoJoin(user.name);
        return;
      }
    } catch {
      // Not authenticated or error — fall through to manual nickname entry
    }
  }

  /** Join the session automatically using the authenticated user's name */
  private async autoJoin(name: string): Promise<void> {
    // Show a loading state in place of the form
    this.setContent(`
      <div class="screen">
        <div class="card">
          <h1>Joining as <em>${name}</em>…</h1>
          <p>PIN: <span class="pin-badge">${this.pin}</span></p>
        </div>
      </div>
    `);

    try {
      const nickname = name.slice(0, 20); // enforce max length
      const response = await api.joinSession({ pin: this.pin, nickname });

      state.setState({
        sessionId: response.sessionId,
        playerId: response.playerId,
        nickname,
        score: 0,
        currentQuestionIndex: -1,
      });

      router.navigate(`/lobby/${response.sessionId}`);
    } catch (error) {
      // Re-render the form so the user can pick a different name
      this.render();

      if (error instanceof ApiError) {
        if (error.status === 409) {
          // Pre-fill the input and explain the conflict
          if (this.nicknameInput) this.nicknameInput.value = name;
          this.showError('Your display name is already taken in this session. Please choose a different one.');
        } else if (error.status === 404) {
          this.showError('Quiz not found. Please check the PIN.');
        } else if (error.status === 403) {
          this.showError('This quiz has already started.');
        } else {
          this.showError(error.message || 'Failed to join quiz. Please try again.');
        }
      } else {
        this.showError('Network error. Please check your connection.');
      }
    }
  }

  protected onUnmount(): void {
    // Cleanup if needed
  }

  protected render(): void {
    this.setContent(`
      <div class="screen">
        <div class="card">
          <h1>Choose Your Name</h1>
          <p><span id="pin-display" class="pin-badge">${this.pin}</span></p>
          
          <form id="nickname-form">
            <input
              type="text"
              id="nickname-input"
              placeholder="Enter your nickname"
              maxlength="20"
              autocomplete="off"
              required
            />
            
            <button type="submit" id="submit-button">
              Continue
            </button>
            
            <button type="button" id="back-button" class="secondary">
              Change PIN
            </button>
            
            <div id="error-message" class="error-message" style="display: none;"></div>
          </form>
        </div>
      </div>
    `);

    // Cache DOM elements
    this.nicknameInput = this.qs<HTMLInputElement>('#nickname-input');
    this.submitButton = this.qs<HTMLButtonElement>('#submit-button');
    this.errorMessage = this.qs<HTMLDivElement>('#error-message');

    // Set up event listeners
    this.setupEventListeners();

    // Focus the input
    this.nicknameInput?.focus();
  }

  private setupEventListeners(): void {
    const form = this.qs<HTMLFormElement>('#nickname-form');
    const backButton = this.qs<HTMLButtonElement>('#back-button');
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    if (backButton) {
      backButton.addEventListener('click', () => {
        router.navigate('/join');
      });
    }

    // Trim spaces from nickname
    if (this.nicknameInput) {
      this.nicknameInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        // Remove leading spaces
        if (target.value.startsWith(' ')) {
          target.value = target.value.trimStart();
        }
      });
    }
  }

  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return;

    const nickname = this.nicknameInput?.value.trim();

    // Validate nickname
    if (!nickname) {
      this.showError('Please enter a nickname');
      return;
    }

    if (nickname.length < 1 || nickname.length > 20) {
      this.showError('Nickname must be 1-20 characters');
      return;
    }

    this.isSubmitting = true;
    this.setLoading(true);
    this.hideError();

    try {
      // Call API to join session
      const response = await api.joinSession({
        pin: this.pin,
        nickname,
      });

      // Store session info in state
      state.setState({
        sessionId: response.sessionId,
        playerId: response.playerId,
        nickname,
        score: 0,
        currentQuestionIndex: -1,
      });

      // Navigate to lobby
      router.navigate(`/lobby/${response.sessionId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          this.showError('Quiz not found. Please check the PIN.');
        } else if (error.status === 409) {
          this.showError('This nickname is already taken. Please choose another.');
        } else if (error.status === 403) {
          this.showError('This quiz has already started.');
        } else {
          this.showError(error.message || 'Failed to join quiz. Please try again.');
        }
      } else {
        this.showError('Network error. Please check your connection.');
      }
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
        this.submitButton.textContent = 'Continue';
      }
    }
    if (this.nicknameInput) {
      this.nicknameInput.disabled = loading;
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
customElements.define('nickname-screen', NicknameScreen);
