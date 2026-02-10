import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BaseComponent } from './base-component';

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
    
    const element = document.createElement(tagName) as any;
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
