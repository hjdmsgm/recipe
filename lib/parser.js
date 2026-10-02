// Rule-based (regex/pattern) recipe extraction — no LLM involved.
// Works best on Korean recipe video descriptions that list ingredients
// under a "재료" heading, which is the most common format.

// English units are made plural-tolerant ("cups", "tbsps") since that's the
// far more common written form in English recipe text.
const UNIT_ALTERNATION =
  "kg|g|mg|ml|리터|l|컵|큰술|작은술|티스푼|스푼|숟가락|줌|꼬집|알|개|장|쪽|모|포기|조각|뿌리|봉지|봉|팩|캔|병|통|근|마리|대|송이|덩이|줄|톨|인분|tbsps?|tsps?|cups?|ozs?|lbs?|eas?|T|t";

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

const DESCRIPTIVE_AMOUNT_REGEX =
  /(약간씩|약간|적당량|적당히|조금씩|조금|한\s*꼬집|톡톡|a\s*pinch|to\s*taste|a\s*dash|a\s*splash|as\s*needed)/i;

// Heading lines come decorated in the wild ("■ 요리 재료 **밥숟가락 계량입니다!",
// "[부대찌개 양념장 재료]", "재료:"...) so headings are detected on a
// "decoration-stripped" version of the line. The keyword can be preceded by
// an arbitrary-length dish-name prefix ("부대찌개 양념장 재료"), so instead of
// anchoring to the start of the line we just require the keyword to sit at
// a word boundary (space/bracket/start before it, space/bracket/colon/digit/
// end after it — `\b` doesn't reliably bound Hangul in JS regex) within an
// overall short line, which rules out ordinary sentences that merely mention
// the word in passing.
const MAX_HEADING_LENGTH = 30;
const DECORATION_REGEX = /^[\s■◆▶▷►▪▫○●☆★✔✅ㆍ·\-\*\[\(【]+/;
const HEADING_START = "(?:^|[\\s:：\\(\\[【])";
const HEADING_END = "(?=$|[\\s:：,，\\(\\)\\[\\]【】!*]|[0-9])";
const INGREDIENT_HEADING_REGEX = new RegExp(`${HEADING_START}(재료|재료명|ingredients?)${HEADING_END}`, "i");
// Note: a bare "recipe" is deliberately NOT a stop-heading keyword — it's
// common enough in ordinary titles/sentences ("Easy Pancakes recipe, serves
// 4") that it would misfire far more often than it would correctly match an
// actual "Recipe:" section header.
const STOP_HEADING_REGEX_STRIPPED = new RegExp(
  `${HEADING_START}(만드는\\s*법|조리\\s*(?:법|방법|순서)|레시피\\s*순서|만들기|비법|instructions?|directions?|steps?|method)${HEADING_END}`,
  "i"
);
// Only "※" reliably means "note/caution" in Korean recipe descriptions —
// "▶"/"*" are generic bullets used for all sorts of unrelated lines
// (credits, links) and would sweep those in as false "tips".
const NOTE_MARKER_REGEX = /^[※◈]/;
const FOOTER_NOISE_REGEX =
  /^(#|구독|좋아요|알림설정|instagram|인스타|블로그|blog|문의|저작권|copyright|편집|촬영|음악|music)/i;
// A "타임스탬프" chapter-index section, or any of its "0:00 제목" entries,
// a bare link, or a plain separator line — none of these are ingredients
// or cooking steps, even though they don't match FOOTER_NOISE_REGEX.
const SECTION_END_REGEX = /^(타임\s*스탬프|타임\s*라인|chapters?|timestamps?)\s*$/i;
const TIMECODE_LINE_REGEX = /^\d{1,2}:\d{2}(:\d{2})?\b/;
const URL_LINE_REGEX = /^https?:\/\//i;
const SEPARATOR_LINE_REGEX = /^-{2,}$/;
function isSectionEnd(line) {
  return (
    SECTION_END_REGEX.test(line) ||
    TIMECODE_LINE_REGEX.test(line) ||
    URL_LINE_REGEX.test(line) ||
    SEPARATOR_LINE_REGEX.test(line)
  );
}

// A standalone sub-heading line ("양념", "[소스]") on its own starts a new
// sub-group. This must be an exact match (not substring) — otherwise an
// actual ingredient like "숙성 양념장 50g" would be mistaken for one.
const SUBHEADING_EXACT_REGEX = /^(양념장?|소스|드레싱|고명|토핑|절임물|반죽|육수|다대기|초장|쌈장)$/i;
// Same keyword set, but used as a substring search — only ever applied to a
// line already confirmed to be an ingredient heading (isIngredientHeading),
// to pull a sub-label out of a compound heading like "부대찌개 양념장 재료".
const SUBHEADING_KEYWORD_REGEX = /(양념장|양념|소스|드레싱|고명|토핑|절임물|반죽|육수|다대기|초장|쌈장)/;

function stripDecoration(line) {
  return line.replace(DECORATION_REGEX, "").trim();
}

function isIngredientHeading(line) {
  const stripped = stripDecoration(line);
  return stripped.length > 0 && stripped.length <= MAX_HEADING_LENGTH && INGREDIENT_HEADING_REGEX.test(stripped);
}

function isStopHeading(line) {
  const stripped = stripDecoration(line);
  return stripped.length > 0 && stripped.length <= MAX_HEADING_LENGTH && STOP_HEADING_REGEX_STRIPPED.test(stripped);
}

// Pulls a sub-group label out of a line already known to be an ingredient
// heading (via isIngredientHeading) — e.g. a compound "부대찌개 양념장 재료"
// line yields "양념장". Returns null for a plain "재료" heading (the
// default, ungrouped section).
function groupLabelFromHeading(line) {
  const stripped = stripDecoration(line).replace(/[:：]$/, "").trim();
  const m = stripped.match(SUBHEADING_KEYWORD_REGEX);
  return m ? m[1] : null;
}

// A standalone sub-heading line with nothing else on it ("양념", "[소스]") —
// distinct from the above: this must match the *entire* stripped line, so a
// real ingredient like "숙성 양념장 50g" is never mistaken for one.
function isStandaloneSubheading(line) {
  const stripped = stripDecoration(line).replace(/[:：]$/, "").trim();
  return SUBHEADING_EXACT_REGEX.test(stripped);
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

// A fragment that starts with a digit/fraction (or is just a descriptive
// amount like "a pinch") right after a comma isn't a separate ingredient —
// it's the amount half of "Name, 2 cups" (the common English convention;
// Korean convention is "이름 수량단위" with no comma at all, so this never
// fires there).
const BARE_AMOUNT_START_REGEX = /^[\d½⅓⅔¼¾]/;
function splitItems(line) {
  const parts = line
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const merged = [];
  for (const part of parts) {
    const isBareAmount =
      merged.length > 0 && (BARE_AMOUNT_START_REGEX.test(part) || DESCRIPTIVE_AMOUNT_REGEX.test(part));
    if (isBareAmount) merged[merged.length - 1] += ` ${part}`;
    else merged.push(part);
  }
  return merged;
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
    // A description can have more than one ingredient heading ("부대찌개
    // 양념장 재료" then later "부대찌개 재료") — the first one's own label
    // sets the initial group, and each later one re-labels the group
    // (possibly back to ungrouped) rather than ending the section.
    let group = groupLabelFromHeading(lines[headingIndex]);

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
      if (FOOTER_NOISE_REGEX.test(line) || isSectionEnd(line)) break;
      if (NOTE_MARKER_REGEX.test(line)) continue;
      if (isIngredientHeading(line)) {
        group = groupLabelFromHeading(line);
        continue;
      }
      if (isStandaloneSubheading(line)) {
        group = stripDecoration(line).replace(/[:：]$/, "").trim();
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
    /(?:cook(?:ing)?|total|prep(?:aration)?)\s*time\s*[:：]?\s*(\d+)\s*(?:minutes?|mins?)/i,
    /ready\s*in\s*(\d+)\s*(?:minutes?|mins?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

// Cheap regex-only timer detection ("약불로 5분간 끓여주세요" -> 300). This is
// one of two pieces of per-step metadata the rule-based path can approximate
// at all (see splitTrailingTip below for the other); ingredientRefs and
// videoTimestampSeconds genuinely need the AI path (see buildRecipeFromAi)
// and stay empty/null here.
function extractTimerSeconds(text) {
  const ko = text.match(/(\d+)\s*분\s*(?:간|동안)?/);
  if (ko) return Number(ko[1]) * 60;
  const en = text.match(/(\d+)\s*(?:minutes?|mins?)\b/i);
  if (en) return Number(en[1]) * 60;
  return null;
}

// A trailing parenthetical that reads like a sentence ("...습니다", "...세요",
// "...좋아요") is almost always a clarifying tip/rationale, not part of the
// instruction itself — e.g. "...섞어 준다 (육수를 마지막에 넣어야 가루가 뜨지
// 않고 쉽게 섞을 수 있습니다)". A short inline one like "(약 3장)" or "(0.5cm
// 두께로)" isn't — it stays part of the instruction text.
const TIP_SENTENCE_END_REGEX = /(세요|니다|좋아요|좋습니다|해요|됩니다)\s*[.!]?$/;
function splitTrailingTip(text) {
  const m = text.match(/^(.*?)\s*\(([^()]{8,})\)\s*$/);
  if (!m) return { text, tip: null };
  const [, core, paren] = m;
  if (core.trim() && TIP_SENTENCE_END_REGEX.test(paren.trim())) {
    return { text: core.trim(), tip: paren.trim() };
  }
  return { text, tip: null };
}

function toStepObject(text) {
  const { text: core, tip } = splitTrailingTip(text);
  return {
    text: core,
    ingredientRefs: [],
    tip,
    timerSeconds: extractTimerSeconds(text),
    videoTimestampSeconds: null,
  };
}

// Normalizes one step from Gemini's response (object per the v2 schema, or
// a bare string from an older response) into the shared step shape. Falls
// back to the regex timer heuristic when Gemini didn't set timerSeconds
// itself, so both extraction paths benefit from it.
function normalizeAiStep(s) {
  if (typeof s === "string") return toStepObject(s);
  const rawText = s.text || "";
  // Gemini usually splits a trailing tip out itself, but falls back to the
  // same regex heuristic when it left one inline anyway.
  const { text, tip: fallbackTip } = s.tip ? { text: rawText, tip: null } : splitTrailingTip(rawText);
  return {
    text,
    ingredientRefs: Array.isArray(s.ingredientRefs) ? s.ingredientRefs.filter(Number.isInteger) : [],
    tip: s.tip || fallbackTip,
    timerSeconds: Number.isFinite(s.timerSeconds) ? s.timerSeconds : extractTimerSeconds(rawText),
    videoTimestampSeconds: Number.isFinite(s.videoTimestampSeconds) ? s.videoTimestampSeconds : null,
  };
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
    if (FOOTER_NOISE_REGEX.test(line) || isSectionEnd(line)) break;
    if (NOTE_MARKER_REGEX.test(line)) continue;
    const cleaned = line.replace(/^(step\s*)?[0-9①②③④⑤⑥⑦⑧⑨⑩]+[.).]?\s*/i, "").trim();
    if (cleaned) steps.push(toStepObject(cleaned));
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

export function buildRecipe({ videoId, title, channel, thumbnail, description, transcript, hasTranscript }) {
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
    channel: channel || "",
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
// shape the frontend expects from buildRecipe() — including wrapping each
// step string into the same {text, ingredientRefs, tip, timerSeconds,
// videoTimestampSeconds} object the rule-based path produces, so the UI
// never has to branch on `source`. The AI schema will eventually populate
// ingredientRefs/tip/videoTimestampSeconds directly (see lib/gemini.js);
// until then they're left empty/null here just like the rule-based path.
export function buildRecipeFromAi(ai, { videoId, title, channel, thumbnail, description, hasTranscript }) {
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
    channel: channel || "",
    thumbnail,
    baseServings,
    servingsGuessed: !Number.isFinite(ai.baseServings),
    cookTimeMinutes: Number.isFinite(ai.cookTimeMinutes) ? ai.cookTimeMinutes : null,
    ingredients,
    steps: (ai.steps || []).filter(Boolean).map(normalizeAiStep),
    tips: (ai.tips || []).filter(Boolean),
    source: "ai",
    hasTranscript: Boolean(hasTranscript),
    hasIngredients: ingredients.length > 0,
    rawDescription: description || "",
  };
}
