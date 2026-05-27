import morphdom from 'morphdom';

/**
 * Patch a container's DOM in-place using morphdom.
 * Only elements that actually changed are updated, preserving focus,
 * scroll position, and CSS animations on unchanged nodes.
 */
export function patchDOM(container: HTMLElement, html: string): void {
  if (!container.firstElementChild) {
    container.innerHTML = html;
    return;
  }

  const template = document.createElement('div');
  template.innerHTML = html;

  if (template.children.length === 1 && container.children.length === 1) {
    morphdom(container.firstElementChild, template.firstElementChild!, {
      onBeforeElUpdated(fromEl, toEl) {
        if (fromEl === document.activeElement) {
          if (fromEl.tagName === 'INPUT' || fromEl.tagName === 'TEXTAREA' || fromEl.tagName === 'SELECT') {
            return false;
          }
        }
        return !fromEl.isEqualNode(toEl);
      },
    });
  } else {
    morphdom(container, template, {
      childrenOnly: true,
      onBeforeElUpdated(fromEl, toEl) {
        if (fromEl === document.activeElement) {
          if (fromEl.tagName === 'INPUT' || fromEl.tagName === 'TEXTAREA' || fromEl.tagName === 'SELECT') {
            return false;
          }
        }
        return !fromEl.isEqualNode(toEl);
      },
    });
  }
}
