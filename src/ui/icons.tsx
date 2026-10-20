import type { ReactNode } from 'react';

/**
 * The marks on the two workspace actions: a printer for Cetak, a bin for Hapus.
 *
 * Both are drawn through one wrapper, so they cannot drift apart — the same
 * viewBox, stroke weight and cap style as `AiMark`. A printer drawn heavier than
 * the sparkle two panels below it reads as a different product.
 *
 * Decorative. The button's own label names the action, so the mark is
 * `aria-hidden`: without it a screen reader would announce "Cetak" twice, once
 * for the glyph and once for the word.
 */
function Mark({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      className="mark"
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
      {children}
    </svg>
  );
}

/** A printer: the sheet feeds in at the top and comes out face-up at the front. */
export function PrintMark({ size = 15 }: { size?: number }) {
  return (
    <Mark size={size}>
      <path d="M6 9V2h12v7" />
      {/* The body is open along its bottom edge, which is where the tray sits —
          a closed edge would cut a line across the sheet. */}
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </Mark>
  );
}

/**
 * A lidded bin, with nothing in it.
 *
 * Not the variant with two lines inside: those say "empty this container", and
 * nothing here is being emptied. This button destroys the decision.
 */
export function TrashMark({ size = 15 }: { size?: number }) {
  return (
    <Mark size={size}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </Mark>
  );
}
