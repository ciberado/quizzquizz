/**
 * FitText — lightweight text fitting utility.
 *
 * Dynamically adjusts font-size so text fits within its container.
 * Always allows natural text wrapping (white-space: normal) and word breaking.
 */

export interface FitTextOptions {
  /** Minimum font-size in px (default: 12) */
  minSize?: number;
  /** Maximum font-size in px (default: 40) */
  maxSize?: number;
}

/**
 * Adjusts `element`'s font-size so its text fits within the element's box.
 *
 * Multi-line content is scaled down proportionally if scrollHeight exceeds
 * clientHeight.  Short content stays at `maxSize`.
 * Always sets `white-space: normal` so text wraps naturally.
 *
 * Call after the element is in the DOM with its final container dimensions.
 * Safe to call repeatedly.
 */
export function fitText(element: HTMLElement, opts: FitTextOptions = {}): void {
  const minSize = opts.minSize ?? 12;
  const maxSize = opts.maxSize ?? 40;

  element.style.whiteSpace = 'normal';
  element.style.overflowWrap = 'break-word';
  element.style.wordBreak = 'break-word';

  element.style.fontSize = `${maxSize}px`;

  if (element.scrollHeight <= element.clientHeight + 1) {
    return; // Already fits at max size
  }

  const ratio = element.clientHeight / element.scrollHeight;
  const scaled = Math.round(maxSize * ratio);
  const newSize = Math.max(minSize, Math.min(maxSize, scaled));

  element.style.fontSize = `${newSize}px`;

  if (element.scrollHeight > element.clientHeight + 1) {
    let size = newSize - 1;
    while (size >= minSize) {
      element.style.fontSize = `${size}px`;
      if (element.scrollHeight <= element.clientHeight + 1) break;
      size--;
    }
  }
}
