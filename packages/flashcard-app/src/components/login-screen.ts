import { LoginScreenBase } from '@quizzquizz/auth-ui';
import { router } from '../router';

/**
 * Login/Signup screen for flashcard authentication.
 * Auth API calls are handled by LoginScreenBase (shared /api/auth/* endpoints).
 */
class FlashcardLoginScreen extends LoginScreenBase {
  protected navigateHome(): void {
    router.navigate('/');
  }

  protected getSignInSubtitle(): string {
    return 'Sign in to track your flashcard progress';
  }

  protected getSignUpSubtitle(): string {
    return 'Sign up to save your study history';
  }
}

customElements.define('flashcard-login-screen', FlashcardLoginScreen);
