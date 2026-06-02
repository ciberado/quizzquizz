import './styles.css';
import './components/nav-header';
import './components/login-screen';
import './components/change-password-screen';
import './components/user-list-screen';

import { route, startRouter, navigate, getCurrentPath } from './router';
import { getSession } from './api-client';

const app = document.getElementById('app')!;

function mountComponent(tagName: string): void {
  app.innerHTML = `<${tagName}></${tagName}>`;
}

async function guardedRoute(tagName: string, requireAdmin = true): Promise<void> {
  const session = await getSession();

  if (!session || !session.user) {
    navigate('/login');
    return;
  }

  if (requireAdmin && !session.user.isAdmin) {
    app.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;">
        <h2 style="color:#e53e3e;">Access Denied</h2>
        <p style="color:#a0aec0;">This account does not have admin privileges.</p>
      </div>
    `;
    return;
  }

  if (session.user.mustChangePassword && getCurrentPath() !== '/change-password') {
    navigate('/change-password');
    return;
  }

  mountComponent(tagName);
}

route('/login', () => mountComponent('admin-login-screen'));
route('/change-password', () => guardedRoute('admin-change-password-screen', false));
route('/users', () => guardedRoute('admin-user-list-screen'));
route('/', () => navigate('/users'));
route('*', () => navigate('/users'));

window.addEventListener('auth-changed', () => {
  // Re-evaluate current route on auth state changes
  const path = getCurrentPath();
  if (path === '/login') navigate('/users');
});

startRouter();
