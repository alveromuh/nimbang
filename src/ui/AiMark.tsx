/**
 * The mark on a button that asks a model for help.
 *
 * A sparkle rather than a chat bubble: it says "generated" without promising a
 * conversation, and it is the same glyph the user sees on both AI buttons so the
 * two read as one feature.
 *
 * Decorative by default — the button's own text already says what it does, so an
 * `aria-label` here would make a screen reader announce it twice.
 */
export function AiMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      className="ai-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
      <path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </svg>
  );
}
