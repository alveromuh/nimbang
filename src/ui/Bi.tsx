import type { BiText } from './i18n';

/**
 * Indonesian, with English underneath at lower opacity.
 *
 * Used for headings, labels and hints — the places a reader can get stuck. Not
 * used for buttons or errors: a second line under every action doubles the
 * vertical space and makes a calm form feel like a manual.
 *
 * The English line is `aria-hidden`. Inside a `<label>` it would otherwise become
 * part of the accessible name — the field would announce "Opsi Option 2" — and a
 * screen reader user does not need the same label twice in two languages. The
 * visible second line is a reading aid for people scanning the form.
 */
export function Bi({ text }: { text: BiText }) {
  return (
    <span className="bi">
      <span className="bi__id">{text.id}</span>
      <span className="bi__en" lang="en" aria-hidden="true">
        {text.en}
      </span>
    </span>
  );
}

/** The Indonesian line only, for places where a second line would crowd. */
export function bi(text: BiText): string {
  return text.id;
}
