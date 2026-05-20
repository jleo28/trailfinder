/**
 * Load a Google Font subset at edge runtime for use with next/og.
 * Fetches only the glyphs needed for `text`, keeping response small.
 * Returns null on any network/parse failure so callers can fall back.
 */
export async function loadGoogleFont(
  family: string,
  weight: 400 | 600 | 700,
  text: string
): Promise<ArrayBuffer | null> {
  try {
    const params = new URLSearchParams({
      family: `${family}:wght@${weight}`,
      display: "swap",
      text,
    });
    const css = await fetch(`https://fonts.googleapis.com/css2?${params}`, {
      headers: {
        // Request TTF/OTF rather than WOFF2 (satori needs TTF/OTF)
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    }).then((r) => r.text());

    const resource = css.match(/src: url\((.+?)\)/)?.[1];
    if (!resource) return null;

    return fetch(resource).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}
