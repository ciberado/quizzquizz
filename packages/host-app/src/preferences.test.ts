import { describe, it, expect, beforeEach } from 'vitest';
import { preferences } from './preferences';
import type { QuizPreferences } from './preferences';

describe('preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('load returns defaults when nothing stored', () => {
    const prefs = preferences.load();
    expect(prefs).toEqual(preferences.DEFAULTS);
  });

  it('save then load round-trips correctly', () => {
    const custom: QuizPreferences = {
      randomOrder: true,
      shuffleAnswers: false,
      pace: 'calm',
      autoQuestionTime: false,
    };
    preferences.save(custom);

    const loaded = preferences.load();
    expect(loaded).toEqual(custom);
  });

  it('load merges partial stored data with defaults', () => {
    localStorage.setItem(
      'quizzquizz_host_preferences',
      JSON.stringify({ pace: 'manual' }),
    );

    const loaded = preferences.load();
    expect(loaded.pace).toBe('manual');
    // Other fields should be defaults
    expect(loaded.randomOrder).toBe(preferences.DEFAULTS.randomOrder);
    expect(loaded.shuffleAnswers).toBe(preferences.DEFAULTS.shuffleAnswers);
    expect(loaded.autoQuestionTime).toBe(preferences.DEFAULTS.autoQuestionTime);
  });

  it('load returns defaults on corrupt JSON', () => {
    localStorage.setItem('quizzquizz_host_preferences', '{broken');
    const loaded = preferences.load();
    expect(loaded).toEqual(preferences.DEFAULTS);
  });

  it('DEFAULTS has autoQuestionTime true', () => {
    expect(preferences.DEFAULTS.autoQuestionTime).toBe(true);
  });

  it('DEFAULTS has shuffleAnswers true', () => {
    expect(preferences.DEFAULTS.shuffleAnswers).toBe(true);
  });

  it('DEFAULTS has pace normal', () => {
    expect(preferences.DEFAULTS.pace).toBe('normal');
  });
});
