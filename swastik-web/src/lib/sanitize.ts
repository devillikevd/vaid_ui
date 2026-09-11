/**
 * sanitize.ts — shared HTML sanitisation helpers
 *
 * Uses isomorphic-dompurify so the same import works on the server (SSR/RSC)
 * and in the browser.  All medical content that comes from the database and is
 * rendered via dangerouslySetInnerHTML must be passed through `sanitizeHtml`
 * before use.
 *
 * Allowed tags/attributes are deliberately restrictive:
 *   - Structural: p, ul, ol, li, br, div, span, section
 *   - Emphasis:   strong, em, b, i
 *   - No <script>, <iframe>, <form>, event handlers, or javascript: hrefs.
 */
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'ul', 'ol', 'li', 'br', 'div', 'span', 'section',
  'strong', 'em', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = ['class', 'id'];

/**
 * Sanitise a potentially-unsafe HTML string from the database.
 * Returns an empty string if the input is falsy.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: false,
  });
}

/**
 * Safely serialises a plain JS value as a JSON-LD string for use as
 * a React text child inside <script type="application/ld+json">.
 *
 * Escaping < > & prevents the string from breaking out of the <script>
 * context if it is ever accidentally moved into an innerHTML context.
 */
export function buildJsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
