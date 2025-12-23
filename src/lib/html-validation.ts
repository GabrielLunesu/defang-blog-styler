const ARTICLE_OPEN_RE =
  /^\s*<article\b[^>]*class=["'][^"']*\bdefang-blog\b[^"']*["'][^>]*>/i;
const ARTICLE_CLOSE_RE = /<\/article>\s*$/i;
const DISALLOWED_TAGS = ["script", "style", "iframe", "object", "embed", "link", "meta"];
const DISALLOWED_TAG_RE = new RegExp(`<\\s*(?:${DISALLOWED_TAGS.join("|")})\\b`, "i");

type ValidationResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

export const validateDefangHtml = (html: string): ValidationResult => {
  const trimmed = html.trim();

  if (!trimmed) {
    return { ok: false, error: "Model returned empty HTML" };
  }

  if (!ARTICLE_OPEN_RE.test(trimmed)) {
    return {
      ok: false,
      error: 'Output must start with <article class="defang-blog">',
    };
  }

  if (!ARTICLE_CLOSE_RE.test(trimmed)) {
    return { ok: false, error: "Output must end with </article>" };
  }

  if (DISALLOWED_TAG_RE.test(trimmed)) {
    return { ok: false, error: "Output contains disallowed tags" };
  }

  return { ok: true, html: trimmed };
};
