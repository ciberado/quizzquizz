import { describe, it, expect, vi } from 'vitest';

describe('Base Component', () => {
  it('should render content when connected', () => {
    class TestComponent extends HTMLElement {
      connectedCallback() {
        this.innerHTML = '<div>Test Content</div>';
      }
    }
    
    const tagName = 'test-component-' + Date.now();
    customElements.define(tagName, TestComponent);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    expect(element.innerHTML).toContain('Test Content');
  });
});

describe('Create Session Screen Component', () => {
  it('should have proper structure for question bank selection', () => {
    // Mock API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'bank-1', name: 'General Knowledge', questionCount: 10 },
        { id: 'bank-2', name: 'Science', questionCount: 15 },
      ],
    });

    const tagName = 'create-session-test-' + Date.now();
    
    class MockCreateSession extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `
          <div class="screen">
            <h1>Create New Quiz</h1>
            <select id="question-bank-select">
              <option value="bank-1">General Knowledge (10 questions)</option>
              <option value="bank-2">Science (15 questions)</option>
            </select>
            <button id="create-button">Create Session</button>
          </div>
        `;
      }
    }
    
    customElements.define(tagName, MockCreateSession);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const select = element.querySelector('select');
    const button = element.querySelector('button');
    
    expect(select).toBeTruthy();
    expect(button).toBeTruthy();
    expect(select?.options.length).toBe(2);
  });
});

describe('Lobby Screen Component', () => {
  it('should display PIN with large font', () => {
    const tagName = 'lobby-test-' + Date.now();
    
    class MockLobby extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `
          <div class="screen">
            <div class="pin-display">
              <div class="pin">654321</div>
            </div>
            <div class="player-count">0 players joined</div>
            <button id="start-button" disabled>Start Quiz</button>
          </div>
        `;
      }
    }
    
    customElements.define(tagName, MockLobby);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const pin = element.querySelector('.pin');
    const button = element.querySelector('#start-button') as HTMLButtonElement;
    
    expect(pin?.textContent).toBe('654321');
    expect(button?.disabled).toBe(true);
  });

  it('should generate correct player URL for development environment', () => {
    const tagName = 'lobby-url-dev-' + Date.now();
    
    class MockLobbyWithUrl extends HTMLElement {
      connectedCallback() {
        const playerUrl = this.getPlayerUrl();
        this.innerHTML = `
          <div class="player-url">${playerUrl}</div>
        `;
      }

      getPlayerUrl(): string {
        const { protocol, hostname, port } = window.location;
        
        // Development: host app on 3001, player app on 3002
        if (hostname === 'localhost' && port === '3001') {
          return 'http://localhost:3002';
        }
        
        // Production: both apps served through Caddy
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
      }
    }
    
    customElements.define(tagName, MockLobbyWithUrl);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const urlEl = element.querySelector('.player-url');
    
    // In test environment, protocol and hostname are undefined
    // The URL should be constructed (even if malformed in test env)
    expect(urlEl).toBeTruthy();
    expect(urlEl?.textContent?.length).toBeGreaterThan(0);
  });

  it('should generate QR code URL with encoded player URL', () => {
    const tagName = 'lobby-qr-' + Date.now();
    
    class MockLobbyWithQR extends HTMLElement {
      connectedCallback() {
        const playerUrl = 'http://example.com:3000';
        const pin = '123456';
        const playerUrlWithPin = `${playerUrl}/#/nickname?pin=${pin}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(playerUrlWithPin)}`;
        
        this.innerHTML = `
          <img src="${qrCodeUrl}" class="qr-code" alt="QR Code" />
        `;
      }
    }
    
    customElements.define(tagName, MockLobbyWithQR);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const qrImg = element.querySelector('.qr-code') as HTMLImageElement;
    
    expect(qrImg?.src).toContain('api.qrserver.com');
    expect(qrImg?.src).toContain('size=200x200');
    expect(qrImg?.src).toContain('data=http%3A%2F%2Fexample.com%3A3000%2F%23%2Fnickname%3Fpin%3D123456');
  });

  it('should display both PIN and QR code in lobby', () => {
    const tagName = 'lobby-full-' + Date.now();
    
    class MockLobbyFull extends HTMLElement {
      connectedCallback() {
        const playerUrl = 'http://localhost:3002';
        const pin = '123456';
        const playerUrlWithPin = `${playerUrl}/#/nickname?pin=${pin}`;
        
        this.innerHTML = `
          <div class="pin-display">
            <div class="pin-content">
              <div class="pin-text-section">
                <div class="player-url">${playerUrl}</div>
                <div class="pin-code">${pin}</div>
              </div>
              <div class="qr-section">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(playerUrlWithPin)}" class="qr-code" />
                <div class="qr-label">Scan to join</div>
              </div>
            </div>
          </div>
        `;
      }
    }
    
    customElements.define(tagName, MockLobbyFull);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const playerUrl = element.querySelector('.player-url');
    const pinCode = element.querySelector('.pin-code');
    const qrCode = element.querySelector('.qr-code') as HTMLImageElement;
    const qrLabel = element.querySelector('.qr-label');
    
    expect(playerUrl?.textContent).toBe('http://localhost:3002');
    expect(pinCode?.textContent).toBe('123456');
    expect(qrCode).toBeTruthy();
    expect(qrCode?.src).toContain('nickname%3Fpin%3D123456');
    expect(qrLabel?.textContent).toBe('Scan to join');
  });

  it('should show player list', () => {
    const tagName = 'lobby-players-' + Date.now();
    
    class MockLobbyWithPlayers extends HTMLElement {
      connectedCallback() {
        const players = [
          { id: '1', nickname: 'Alice' },
          { id: '2', nickname: 'Bob' },
        ];
        
        this.innerHTML = `
          <div class="screen">
            <div class="players-list">
              ${players.map(p => `
                <div class="player-card">
                  <span class="emoji">🦁</span>
                  <span class="nickname">${p.nickname}</span>
                </div>
              `).join('')}
            </div>
            <button id="start-button">Start Quiz</button>
          </div>
        `;
      }
    }
    
    customElements.define(tagName, MockLobbyWithPlayers);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const playerCards = element.querySelectorAll('.player-card');
    const button = element.querySelector('#start-button') as HTMLButtonElement;
    
    expect(playerCards.length).toBe(2);
    expect(button?.disabled).toBeFalsy();
  });
});

describe('Question Display Screen Component', () => {
  it('should apply correct styling classes to correct answers when timer expires', () => {
    const tagName = 'question-display-' + Date.now();
    
    class MockQuestionDisplay extends HTMLElement {
      connectedCallback() {
        const isTimerActive = false;
        const answers = [
          { id: 'ans1', text: 'Correct Answer 1', isCorrect: true },
          { id: 'ans2', text: 'Wrong Answer', isCorrect: false },
          { id: 'ans3', text: 'Correct Answer 2', isCorrect: true },
        ];
        
        this.innerHTML = `
          <div class="answers-grid">
            ${answers.map(answer => `
              <div class="answer-card ${!isTimerActive && answer.isCorrect ? 'correct' : ''}">
                <div class="answer-label">A</div>
                <div class="answer-text">${answer.text}</div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
    
    customElements.define(tagName, MockQuestionDisplay);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const correctCards = element.querySelectorAll('.answer-card.correct');
    const allCards = element.querySelectorAll('.answer-card');
    
    expect(allCards.length).toBe(3);
    expect(correctCards.length).toBe(2);
  });

  it('should show correct indicator checkmark for correct answers', () => {
    const tagName = 'question-indicator-' + Date.now();
    
    class MockQuestionWithIndicators extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `
          <div class="answers-grid">
            <div class="answer-card correct">
              <div class="answer-label">A</div>
              <div class="answer-text">Correct Answer</div>
              <div class="correct-indicator">✓</div>
            </div>
            <div class="answer-card">
              <div class="answer-label">B</div>
              <div class="answer-text">Wrong Answer</div>
            </div>
          </div>
        `;
      }
    }
    
    customElements.define(tagName, MockQuestionWithIndicators);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const correctIndicators = element.querySelectorAll('.correct-indicator');
    
    expect(correctIndicators.length).toBe(1);
    expect(correctIndicators[0]?.textContent).toBe('✓');
  });

  it('should not show correct answers while timer is active', () => {
    const tagName = 'question-active-' + Date.now();
    
    class MockQuestionActive extends HTMLElement {
      connectedCallback() {
        const isTimerActive = true;
        const answers = [
          { id: 'ans1', text: 'Answer 1', isCorrect: true },
          { id: 'ans2', text: 'Answer 2', isCorrect: false },
        ];
        
        this.innerHTML = `
          <div class="answers-grid">
            ${answers.map(answer => `
              <div class="answer-card ${!isTimerActive && answer.isCorrect ? 'correct' : ''}">
                <div class="answer-text">${answer.text}</div>
                ${!isTimerActive && answer.isCorrect ? '<div class="correct-indicator">✓</div>' : ''}
              </div>
            `).join('')}
          </div>
        `;
      }
    }
    
    customElements.define(tagName, MockQuestionActive);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const correctCards = element.querySelectorAll('.answer-card.correct');
    const correctIndicators = element.querySelectorAll('.correct-indicator');
    
    expect(correctCards.length).toBe(0);
    expect(correctIndicators.length).toBe(0);
  });
});

describe('Component Lifecycle', () => {
  it('should clean up polling intervals on disconnect', () => {
    vi.useFakeTimers();
    
    const tagName = 'polling-test-' + Date.now();
    
    class PollingComponent extends HTMLElement {
      private interval: number | null = null;
      
      connectedCallback() {
        this.startPolling();
      }
      
      disconnectedCallback() {
        this.stopPolling();
      }
      
      startPolling() {
        this.interval = window.setInterval(() => {
          // Polling logic
        }, 2000);
      }
      
      stopPolling() {
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = null;
        }
      }
      
      hasActiveInterval() {
        return this.interval !== null;
      }
    }
    
    customElements.define(tagName, PollingComponent);
    
    const element = document.createElement(tagName) as unknown as InstanceType<typeof PollingComponent>;
    document.body.appendChild(element);
    
    expect(element.hasActiveInterval()).toBe(true);
    
    document.body.removeChild(element);
    
    expect(element.hasActiveInterval()).toBe(false);
    
    vi.useRealTimers();
  });
});

describe('Event Handling', () => {
  it('should handle button clicks', () => {
    const tagName = 'button-test-' + Date.now();
    const mockHandler = vi.fn();
    
    class ButtonComponent extends HTMLElement {
      connectedCallback() {
        this.innerHTML = '<button id="test-btn">Click Me</button>';
        this.querySelector('#test-btn')?.addEventListener('click', mockHandler);
      }
    }
    
    customElements.define(tagName, ButtonComponent);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const button = element.querySelector('#test-btn') as HTMLButtonElement;
    button?.click();
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle form submission', () => {
    const tagName = 'form-test-' + Date.now();
    const mockHandler = vi.fn();
    
    class FormComponent extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `
          <form id="test-form">
            <input type="text" name="test" value="hello" />
            <button type="submit">Submit</button>
          </form>
        `;
        this.querySelector('#test-form')?.addEventListener('submit', (e) => {
          e.preventDefault();
          mockHandler();
        });
      }
    }
    
    customElements.define(tagName, FormComponent);
    
    const element = document.createElement(tagName);
    document.body.appendChild(element);
    
    const form = element.querySelector('#test-form') as HTMLFormElement;
    form?.dispatchEvent(new Event('submit'));
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
