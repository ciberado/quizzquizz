/**
 * Question Statistics Table Component
 * Displays question-by-question performance metrics
 * Supports sorting and detail expansion
 */

interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
  selectionCount: number;
  selectionPercentage: number;
}

interface QuestionStat {
  questionIndex: number;
  questionId: string;
  questionText: string;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyPercentage: number;
  difficulty: string;
  topics: string[];
  answerOptions: AnswerOption[];
}

type SortField = 'order' | 'accuracy';

export class QuestionStatsTable extends HTMLElement {
  private questions: QuestionStat[] = [];
  private sortBy: SortField = 'order';
  private expandedQuestionId: string | null = null;

  connectedCallback() {
    this.render();
  }

  setData(questions: QuestionStat[]) {
    this.questions = questions;
    this.render();
  }

  private handleSort(field: SortField) {
    this.sortBy = field;
    this.render();
  }

  private toggleDetails(questionId: string) {
    if (this.expandedQuestionId === questionId) {
      this.expandedQuestionId = null;
    } else {
      this.expandedQuestionId = questionId;
    }
    this.render();
  }

  private getSortedQuestions(): QuestionStat[] {
    const sorted = [...this.questions];
    
    if (this.sortBy === 'order') {
      sorted.sort((a, b) => a.questionIndex - b.questionIndex);
    } else if (this.sortBy === 'accuracy') {
      sorted.sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    }
    
    return sorted;
  }

  private getDifficultyBadge(difficulty: string): string {
    const colorMap: Record<string, string> = {
      easy: '#4caf50',
      medium: '#ff9800',
      hard: '#f44336',
    };
    
    const color = colorMap[difficulty.toLowerCase()] || '#999';
    
    return `<span class="difficulty-badge" style="background-color: ${color}">${difficulty}</span>`;
  }

  private getAccuracyColor(percentage: number): string {
    if (percentage >= 75) return '#4caf50';
    if (percentage >= 50) return '#ff9800';
    return '#f44336';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private render() {
    const sortedQuestions = this.getSortedQuestions();

    this.innerHTML = `
      <div class="question-stats-table">
        <div class="stats-header">
          <h2>📊 Question Performance</h2>
          <div class="sort-controls">
            <label>Sort by:</label>
            <button 
              class="sort-btn ${this.sortBy === 'order' ? 'active' : ''}" 
              data-sort="order"
            >
              Order
            </button>
            <button 
              class="sort-btn ${this.sortBy === 'accuracy' ? 'active' : ''}" 
              data-sort="accuracy"
            >
              Accuracy
            </button>
          </div>
        </div>

        ${sortedQuestions.length === 0 ? `
          <div class="empty-stats">
            <p>No question data available yet.</p>
          </div>
        ` : `
          <table class="stats-table">
            <thead>
              <tr>
                <th>Q#</th>
                <th>Question</th>
                <th>Responses</th>
                <th>Correct</th>
                <th>Incorrect</th>
                <th>Accuracy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${sortedQuestions.map((q) => this.renderQuestionRow(q)).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;

    // Add event listeners
    this.querySelectorAll('.sort-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const sortField = target.getAttribute('data-sort') as SortField;
        this.handleSort(sortField);
      });
    });

    this.querySelectorAll('.question-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const questionId = target.closest('.question-row')?.getAttribute('data-question-id');
        if (questionId) {
          this.toggleDetails(questionId);
        }
      });
    });
  }

  private renderQuestionRow(question: QuestionStat): string {
    const isExpanded = this.expandedQuestionId === question.questionId;
    const accuracyColor = this.getAccuracyColor(question.accuracyPercentage);

    return `
      <tr class="question-row ${isExpanded ? 'expanded' : ''}" data-question-id="${question.questionId}">
        <td class="q-number">${question.questionIndex + 1}</td>
        <td class="q-text">
          <div class="q-text-preview">${this.escapeHtml(question.questionText.substring(0, 60))}${question.questionText.length > 60 ? '...' : ''}</div>
        </td>
        <td class="q-total">${question.totalAnswers}</td>
        <td class="q-correct">
          <span class="count" style="color: #4caf50">✓ ${question.correctAnswers}</span>
        </td>
        <td class="q-incorrect">
          <span class="count" style="color: #f44336">✗ ${question.incorrectAnswers}</span>
        </td>
        <td class="q-accuracy">
          <div class="accuracy-cell">
            <span class="percentage" style="color: ${accuracyColor}; font-weight: bold;">
              ${question.accuracyPercentage}%
            </span>
            <div class="accuracy-bar">
              <div 
                class="accuracy-fill" 
                style="width: ${question.accuracyPercentage}%; background-color: ${accuracyColor};"
              ></div>
            </div>
          </div>
        </td>
        <td class="q-expand">
          <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
        </td>
      </tr>
      ${isExpanded ? this.renderQuestionDetails(question) : ''}
    `;
  }

  private renderQuestionDetails(question: QuestionStat): string {
    return `
      <tr class="question-details">
        <td colspan="7">
          <div class="details-content">
            <div class="detail-row">
              <strong>Full Question:</strong>
              <p>${this.escapeHtml(question.questionText)}</p>
            </div>
            
            <div class="detail-row stats-summary-compact">
              <span class="stat-compact">Total: <strong>${question.totalAnswers}</strong></span>
              <span class="stat-separator">|</span>
              <span class="stat-compact" style="color: #4caf50">Correct: <strong>${question.correctAnswers}</strong></span>
              <span class="stat-separator">|</span>
              <span class="stat-compact" style="color: #f44336">Incorrect: <strong>${question.incorrectAnswers}</strong></span>
              <span class="stat-separator">|</span>
              <span class="stat-compact">Accuracy: <strong>${question.accuracyPercentage}%</strong></span>
            </div>
            
            <div class="detail-row meta-row">
              ${this.getDifficultyBadge(question.difficulty)}
              ${question.topics.length > 0 ? question.topics.map(topic => `<span class="topic-tag">${this.escapeHtml(topic)}</span>`).join('') : ''}
            </div>
            
            ${question.answerOptions.length > 0 ? `
              <div class="detail-row">
                <strong>Answer Options:</strong>
                <div class="answer-options-list">
                  ${question.answerOptions.map(option => this.renderAnswerOption(option)).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  private renderAnswerOption(option: AnswerOption): string {
    const statusClass = option.isCorrect ? 'answer-correct' : 'answer-incorrect';
    const statusIcon = option.isCorrect ? '✓' : '✗';
    const statusColor = option.isCorrect ? '#4caf50' : '#999';
    
    return `
      <div class="answer-option ${statusClass}">
        <span class="answer-status" style="color: ${statusColor}">${statusIcon}</span>
        <span class="answer-text">${this.escapeHtml(option.text)}</span>
        <span class="answer-stats">
          <span class="answer-count">${option.selectionCount} responses</span>
          <span class="answer-percentage">${option.selectionPercentage}%</span>
        </span>
      </div>
    `;
  }
}

customElements.define('question-stats-table', QuestionStatsTable);
