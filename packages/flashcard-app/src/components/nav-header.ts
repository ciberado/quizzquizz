/**
 * Nav Header — top bar with hamburger menu for cross-app navigation.
 */
export class NavHeader extends HTMLElement {
  private menuOpen = false;

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    this.innerHTML = `
      <header class="app-nav-bar">
        <div class="app-nav-brand">
          <a href="/" class="app-nav-title">🎯 QuizzQuizz</a>
          <span class="app-nav-label">Flashcard</span>
        </div>
        <button class="app-nav-hamburger" aria-label="Open navigation menu" title="Menu">☰</button>
      </header>
      <div class="nav-drawer-overlay${this.menuOpen ? ' open' : ''}"></div>
      <nav class="nav-drawer${this.menuOpen ? ' open' : ''}" aria-label="App navigation">
        <div class="nav-drawer-header">
          <span class="nav-drawer-title">Navigation</span>
          <button class="nav-drawer-close" aria-label="Close menu">✕</button>
        </div>
        <div class="nav-drawer-section-title">Switch App</div>
        <a href="/" class="nav-drawer-link">🎮 Player</a>
        <a href="/host" class="nav-drawer-link">📽️ Host</a>
        <a href="/flashcard" class="nav-drawer-link">🃏 Flashcard</a>
        <a href="/analytics" class="nav-drawer-link">📊 Analytics</a>
        <a href="/admin" class="nav-drawer-link">⚙️ Admin</a>
        <hr class="nav-drawer-divider" />
        <a href="https://github.com/ciberado/quizzquizz" target="_blank" rel="noopener noreferrer" class="nav-drawer-link">❓ About</a>
      </nav>
    `;

    this.querySelector('.app-nav-hamburger')?.addEventListener('click', () => {
      this.menuOpen = true;
      this.render();
    });
    this.querySelector('.nav-drawer-close')?.addEventListener('click', () => {
      this.menuOpen = false;
      this.render();
    });
    this.querySelector('.nav-drawer-overlay')?.addEventListener('click', () => {
      this.menuOpen = false;
      this.render();
    });
  }
}

customElements.define('nav-header', NavHeader);
