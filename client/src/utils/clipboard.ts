/**
 * Robust clipboard utility that supports modern Clipboard API with
 * automatic fallback to legacy document.execCommand('copy') for
 * non-secure HTTP contexts, iframes, and older mobile browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Strategy 1: Modern navigator.clipboard API (requires secure context HTTPS/localhost in some browsers)
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[Clipboard] Modern writeText failed, falling back to execCommand:', err);
    }
  }

  // Strategy 2: Fallback textarea execCommand (universal across HTTP, older browsers, and webviews)
  try {
    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Ensure element is off-screen without causing page jump/scroll
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.setAttribute('readonly', '');

    document.body.appendChild(textarea);

    // Safari iOS compatibility
    const isIOS = typeof navigator !== 'undefined' && /ipad|iphone|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textarea.setSelectionRange(0, 999999);
    } else {
      textarea.focus({ preventScroll: true });
      textarea.select();
    }

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    return successful;
  } catch (err) {
    console.error('[Clipboard] Both modern and legacy copy methods failed:', err);
    return false;
  }
}
