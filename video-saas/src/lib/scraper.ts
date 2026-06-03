import * as cheerio from "cheerio";

const CONTENT_SELECTORS = [
  "article",
  '[role="main"]',
  "main",
  ".post-content",
  ".entry-content",
  ".article-body",
  ".article-content",
  ".story-body",
  "#article-body",
  "#content",
  ".content",
];

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export async function scrapeUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ClipForge/1.0; +https://clipforge.ai)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch URL — HTTP ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Strip noise
    $(
      "script, style, nav, header, footer, aside, iframe, noscript, " +
        '[class*="sidebar"], [class*="advertisement"], [class*="banner"], ' +
        '[id*="sidebar"], [id*="advertisement"], [role="navigation"], ' +
        '[role="banner"], [role="complementary"]'
    ).remove();

    // Try priority selectors
    for (const sel of CONTENT_SELECTORS) {
      const el = $(sel);
      if (el.length > 0) {
        const text = cleanText(el.text());
        if (text.length > 300) return text.slice(0, 8_000);
      }
    }

    // Last resort: full body text
    const bodyText = cleanText($("body").text());
    if (bodyText.length < 50) {
      throw new Error("Could not extract meaningful content from the URL");
    }
    return bodyText.slice(0, 8_000);
  } finally {
    clearTimeout(timer);
  }
}

export function isHttpUrl(input: string): boolean {
  try {
    const { protocol } = new URL(input);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
