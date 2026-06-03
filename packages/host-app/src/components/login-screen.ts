import { LoginScreenBase } from '@quizzquizz/auth-ui';
import { router } from '../router';

/**
 * Login/Signup screen for host authentication.
 * Auth API calls are handled by LoginScreenBase (shared /api/auth/* endpoints).
 */
export class LoginScreen extends LoginScreenBase {
  protected navigateHome(): void {
    router.navigate('/');
  }

  protected getSignInSubtitle(): string {
    return 'Sign in to manage your quizzes';
  }

  protected getSignUpSubtitle(): string {
    return 'Sign up to save your quiz history';
  }
}

customElements.define('login-screen', LoginScreen);
