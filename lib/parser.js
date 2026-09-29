// Rule-based (regex/pattern) recipe extraction — no LLM involved.
// Works best on Korean recipe video descriptions that list ingredients
// under a "재료" heading, which is the most common format.

const UNIT_ALTERNATION =
  "kg|g|mg|ml|리터|l|컵|큰술|작은술|티스푼|스푼|숟가락|줌|꼬집|알|개|장|쪽|모|포기|조각|뿌리|봉지|봉|팩|캔|병|통|근|마리|대|송이|덩이|줄|톨|인분|tbsp|tsp|cup|oz|lb|ea|T|t";

// Fraction alternative ("1/2") must come before the plain-number alternative,
// since regex alternation picks the first branch that matches at a position
// (not the longest) — plain-number would otherwise grab just the "1".
const QTY_UNIT_REGEX = new RegExp(
  `([0-9]+\\/[0-9]+|[0-9]+(?:[.,][0-9]+)?(?:\\s*[~\\-]\\s*[0-9]+(?:[.,][0-9]+)?)?)\\s*(${UNIT_ALTERNATION})?`,
  "gi"
);

// "반컵", "반모" ("half a cup/block") have no digit, so they're rewritten to
// "0.5컵" etc. before the regex above ever sees them.
const HALF_UNIT_REGEX = new RegExp(`반(${UNIT_ALTERNATION})`, "g");
function expandHalfUnits(line) {
  return line.replace(HALF_UNIT_REGEX, "0.5$1");
}

const DESCRIPTIVE_AMOUNT_REGEX = /(약간씩|약간|적당량|적당히|조금씩|조금|한\s*꼬집|톡톡)/;

// Heading lines come decorated in the wild ("■ 요리 재료 **밥숟가락 계량입니다!",
// "[재료]", "재료:"...) so headings are detected on a "decoration-stripped"
// version of the line, tolerating one short leading label word.
const DECORATION_REGEX = /^[\s■◆▶▷►▪▫○●☆★✔✅ㆍ·\-\*\[\(【]+/;
// Note: `\b` does not reliably bound Hangul (JS regex treats Korean
// characters as non-word), so headings end with an explicit delimiter
// lookahead instead of `\b`.
const HEADING_END = "(?=$|[\\s:：,，\\(\\)\\[\\]【】!*]|[0-9])";
const INGREDIENT_HEADING_REGEX = new RegExp(
  `^(?:[가-힣]{1,3}\\s+)?(재료|재료명|ingredients?)${HEADING_END}`,
  "i"
);
const STOP_HEADING_REGEX_STRIPPED = new RegExp(
  `^(?:[가-힣]{1,3}\\s+)?(만드는\\s*법|조리\\s*법|조리\\s*순서|레시피\\s*순서|만들기|비법|instructions?|directions?|steps?|recipe)${HEADING_END}`,
  "i"
);
// Only "※" reliably means "note/caution" in Korean recipe descriptions —
// "▶"/"*" are generic bullets used for all sorts of unrelated lines
// (credits, links) and would sweep those in as false "tips".
const NOTE_MARKER_REGEX = /^[※◈]/;
const FOOTER_NOISE_REGEX =
  /^(#|구독|좋아요|알림설정|instagram|인스타|블로그|blog|문의|저작권|copyright|편집|촬영|음악|music)/i;

// A short standalone line inside the ingredient block ("양념", "[소스]") starts
// a new sub-group instead of being an ingredient itself.
const SUBHEADING_REGEX = /^(양념장?|소스|드레싱|고명|토핑|절임물|반죽|육수|다대기|초장|쌈장)$/i;

function stripDecoration(line) {
  return line.replace(DECORATION_REGEX, "").trim();
}

function isIngredientHeading(line) {
  return INGREDIENT_HEADING_REGEX.test(stripDecoration(line));
}

function isStopHeading(line) {
  return STOP_HEADING_REGEX_STRIPPED.test(stripDecoration(line));
}

function asSubheadingLabel(line) {
  const stripped = stripDecoration(line).replace(/[:：]$/, "").trim();
  return SUBHEADING_REGEX.test(stripped) ? stripped : null;
}

function toNumber(raw) {
  if (!raw) return null;
  const cleaned = raw.trim().replace(",", ".");
  if (/[~\-]/.test(cleaned)) {
    const parts = cleaned
      .split(/[~\-]/)
      .map((s) => toNumber(s.trim()))
      .filter((v) => v != null);
    if (parts.length === 2) return (parts[0] + parts[1]) / 2;
    if (parts.length === 1) return parts[0];
    return null;
  }
  if (cleaned.includes("/")) {
    const [a, b] = cleaned.split("/").map(Number);
    if (b) return a / b;
    return null;
  }
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function stripBullet(line) {
  return line
    .replace(/^[\s•\-\*•▪●■✔✅ㆍ·▶►▷▪]+/, "")
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]+/, "")
    .trim();
}

function splitItems(line) {
  return line
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseIngredientLine(rawLine) {
  const line = expandHalfUnits(stripBullet(rawLine));
  if (!line) return null;

  const matches = [...line.matchAll(QTY_UNIT_REGEX)].filter((m) => m[0].trim());
  let chosenMatch = matches.length ? matches[matches.length - 1] : null;

  // A second quantity is usually a parenthetical clarification, e.g.
  // "김치 1/4포기(약 600g)" — if it sits inside an unclosed "(", the
  // *first* quantity is the one the recipe actually means.
  if (matches.length >= 2) {
    const last = matches[matches.length - 1];
    const before = line.slice(0, last.index);
    const opens = (before.match(/\(/g) || []).length;
    const closes = (before.match(/\)/g) || []).length;
    if (opens > closes) chosenMatch = matches[0];
  }

  if (chosenMatch && chosenMatch.index != null) {
    const name = line
      .slice(0, chosenMatch.index)
      .trim()
      .replace(/[:：\-–—]+$/, "")
      .replace(/\([^)]*$/, "")
      .trim();
    const after = line
      .slice(chosenMatch.index + chosenMatch[0].length)
      .trim()
      .replace(/^[),.]+/, "")
      .replace(/^\(([^)]*)\)$/, "$1")
      .trim();
    if (name) {
      return {
        name,
        quantity: toNumber(chosenMatch[1]),
        unit: chosenMatch[2] || "",
        note: after || undefined,
        raw: rawLine.trim(),
      };
    }
  }

  const descMatch = line.match(DESCRIPTIVE_AMOUNT_REGEX);
  if (descMatch) {
    const name = line.slice(0, descMatch.index).trim().replace(/[:：\-–—]+$/, "").trim();
    if (name) {
      return { name, quantity: null, unit: descMatch[1], note: undefined, raw: rawLine.trim() };
    }
  }

  return { name: line, quantity: null, unit: "", note: undefined, raw: rawLine.trim() };
}

function extractIngredientEntries(lines) {
  const headingIndex = lines.findIndex((l) => isIngredientHeading(l.trim()));

  if (headingIndex !== -1) {
    const collected = [];
    let group = null;

    let blankStreak = 0;
    for (let i = headingIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        blankStreak++;
        if (blankStreak >= 2) break;
        continue;
      }
      blankStreak = 0;
      if (isStopHeading(line)) break;
      if (FOOTER_NOISE_REGEX.test(line)) break;
      if (NOTE_MARKER_REGEX.test(line)) continue;
      const subheading = asSubheadingLabel(line);
      if (subheading) {
        group = subheading;
        continue;
      }
      for (const raw of splitItems(line)) collected.push({ group, raw });
    }
    if (collected.length) return collected;
  }

  // Fallback: find the longest run of consecutive lines that look like
  // "이름 수량단위" entries (no explicit "재료" heading found).
  const isIngredientLike = lines.map((l) => {
    const t = l.trim();
    if (!t || FOOTER_NOISE_REGEX.test(t)) return false;
    QTY_UNIT_REGEX.lastIndex = 0;
    return QTY_UNIT_REGEX.test(t) && t.length < 60;
  });

  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;

  for (let i = 0; i <= lines.length; i++) {
    const ok = i < lines.length && isIngredientLike[i];
    if (ok) {
      if (curStart === -1) curStart = i;
      curLen++;
    } else {
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
      curStart = -1;
      curLen = 0;
    }
  }

  if (bestLen >= 2) {
    return lines
      .slice(bestStart, bestStart + bestLen)
      .map((l) => ({ group: null, raw: l.trim() }));
  }

  return [];
}

function extractTips(lines) {
  return lines
    .map((l) => l.trim())
    .filter(
      (l) => NOTE_MARKER_REGEX.test(l) && !FOOTER_NOISE_REGEX.test(l) && !/https?:\/\//.test(l)
    )
    .map((l) => l.replace(/^[※◈]+\s*/, "").trim())
    .filter(Boolean);
}

function extractCookTimeMinutes(text) {
  const patterns = [
    /조리\s*시간\s*[:：]?\s*(\d+)\s*분/,
    /소요\s*시간\s*[:：]?\s*(\d+)\s*분/,
    /(\d+)\s*분\s*완성/,
    /(\d+)\s*분\s*소요/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

function extractSteps(lines) {
  const headingIndex = lines.findIndex((l) => isStopHeading(l.trim()));
  if (headingIndex === -1) return [];

  const steps = [];
  let blankStreak = 0;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      blankStreak++;
      if (blankStreak >= 2) break;
      continue;
    }
    blankStreak = 0;
    if (FOOTER_NOISE_REGEX.test(line)) break;
    if (NOTE_MARKER_REGEX.test(line)) continue;
    const cleaned = line.replace(/^(step\s*)?[0-9①②③④⑤⑥⑦⑧⑨⑩]+[.).]?\s*/i, "").trim();
    if (cleaned) steps.push(cleaned);
  }
  return steps;
}

function extractServings(text) {
  const patterns = [
    /(\d+)\s*[~\-]\s*(\d+)\s*인분/,
    /(\d+)\s*인분/,
    /(\d+)\s*인\s*기준/,
    /serves?\s*(\d+)/i,
    /(\d+)\s*servings?/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      if (m[2]) return { servings: Math.round((Number(m[1]) + Number(m[2])) / 2), guessed: false };
      return { servings: Number(m[1]), guessed: false };
    }
  }
  return { servings: 2, guessed: true };
}

export function buildRecipe({ videoId, title, thumbnail, description, transcript, hasTranscript }) {
  const descLines = (description || "").split(/\r?\n/);
  const ingredientEntries = extractIngredientEntries(descLines);
  const ingredients = ingredientEntries
    .map((entry) => {
      const parsed = parseIngredientLine(entry.raw);
      return parsed ? { ...parsed, group: entry.group } : null;
    })
    .filter((ing) => ing && /[a-zA-Z0-9가-힣]/.test(ing.name))
    .map((ing, idx) => ({ id: idx + 1, ...ing }));

  const steps = extractSteps(descLines);
  const tips = extractTips(descLines);
  const combinedText = `${description}\n${transcript || ""}`;
  const { servings, guessed } = extractServings(combinedText);
  const cookTimeMinutes = extractCookTimeMinutes(combinedText);

  return {
    videoId,
    title,
    thumbnail,
    baseServings: servings,
    servingsGuessed: guessed,
    cookTimeMinutes,
    ingredients,
    steps,
    tips,
    source: "rules",
    hasTranscript: Boolean(hasTranscript),
    hasIngredients: ingredients.length > 0,
    rawDescription: description || "",
  };
}

// Normalizes the JSON an LLM returned (see lib/gemini.js) into the same
// shape the frontend expects from buildRecipe().
export function buildRecipeFromAi(ai, { videoId, title, thumbnail, description, hasTranscript }) {
  const ingredients = (ai.ingredients || [])
    .filter((ing) => ing && ing.name && ing.name.trim())
    .map((ing, idx) => ({
      id: idx + 1,
      name: ing.name.trim(),
      quantity: typeof ing.quantity === "number" ? ing.quantity : null,
      unit: ing.unit || "",
      note: ing.note || undefined,
      group: ing.group || null,
    }));

  const baseServings = Number.isFinite(ai.baseServings) ? ai.baseServings : 2;

  return {
    videoId,
    title,
    thumbnail,
    baseServings,
    servingsGuessed: !Number.isFinite(ai.baseServings),
    cookTimeMinutes: Number.isFinite(ai.cookTimeMinutes) ? ai.cookTimeMinutes : null,
    ingredients,
    steps: (ai.steps || []).filter(Boolean),
    tips: (ai.tips || []).filter(Boolean),
    source: "ai",
    hasTranscript: Boolean(hasTranscript),
    hasIngredients: ingredients.length > 0,
    rawDescription: description || "",
  };
}
