const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function extractVideoId(rawUrl) {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/").filter(Boolean)[1] || null;
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/").filter(Boolean)[1] || null;
      }
      const v = u.searchParams.get("v");
      if (v) return v;
    }
    return null;
  } catch {
    return null;
  }
}

// Finds a JSON object literal that starts right after `marker` in `html`,
// by scanning for balanced braces (string-aware) rather than a fragile regex.
function extractJsonAfter(html, marker) {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = html.indexOf("{", idx + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let quoteChar = '"';
  let escape = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === quoteChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quoteChar = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

async function fetchOEmbed(watchUrl) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchWatchPage(videoId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko`, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      Cookie: "CONSENT=YES+1",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`YouTube page fetch failed: ${res.status}`);
  const html = await res.text();

  const playerResponseJson =
    extractJsonAfter(html, "var ytInitialPlayerResponse = ") ||
    extractJsonAfter(html, "ytInitialPlayerResponse = ");

  let description = "";
  let title = "";
  let captionTracks = [];
  let debug = null;

  if (playerResponseJson) {
    try {
      const pr = JSON.parse(playerResponseJson);
      description = pr?.videoDetails?.shortDescription || "";
      title = pr?.videoDetails?.title || "";
      captionTracks =
        pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    } catch (e) {
      debug = { stage: "json-parse", status: res.status, htmlLength: html.length, error: String(e) };
    }
  } else {
    debug = {
      stage: "marker-not-found",
      status: res.status,
      htmlLength: html.length,
      snippet: html.slice(0, 400),
      hasCaptcha: /captcha|unusual traffic|detected unusual/i.test(html),
    };
  }

  return { description, title, captionTracks, debug };
}

function decodeEntities(str) {
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function parseCaptionXml(xml) {
  const matches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  return matches
    .map((m) => decodeEntities(m[1]).trim())
    .filter(Boolean)
    .join(" ");
}

async function fetchTranscript(tracks) {
  if (!tracks || tracks.length === 0) return "";
  const pick =
    tracks.find((t) => t.languageCode === "ko" && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "ko") ||
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks[0];

  if (!pick?.baseUrl) return "";
  try {
    const res = await fetch(pick.baseUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return "";
    const xml = await res.text();
    return parseCaptionXml(xml);
  } catch {
    return "";
  }
}

export async function fetchVideoData(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const [oembed, page] = await Promise.all([
    fetchOEmbed(watchUrl),
    fetchWatchPage(videoId),
  ]);

  const transcript = await fetchTranscript(page.captionTracks);

  return {
    videoId,
    title: oembed?.title || page.title || "",
    thumbnail:
      oembed?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    description: page.description || "",
    transcript,
    hasTranscript: Boolean(transcript),
    debug: page.debug,
  };
}
