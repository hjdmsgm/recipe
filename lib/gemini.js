// Optional upgrade path: if GEMINI_API_KEY is set, recipe extraction is
// handed to Gemini instead of the regex-based parser in parser.js. Returns
// null (never throws) when no key is configured, so callers can fall back
// to the rule-based parser transparently.

const RECIPE_SCHEMA = {
  type: "OBJECT",
  properties: {
    baseServings: { type: "INTEGER", nullable: true },
    cookTimeMinutes: { type: "INTEGER", nullable: true },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          group: { type: "STRING", nullable: true },
          name: { type: "STRING" },
          quantity: { type: "NUMBER", nullable: true },
          unit: { type: "STRING", nullable: true },
          note: { type: "STRING", nullable: true },
        },
        required: ["name"],
      },
    },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          ingredientRefs: { type: "ARRAY", items: { type: "INTEGER" } },
          tip: { type: "STRING", nullable: true },
          timerSeconds: { type: "INTEGER", nullable: true },
          videoTimestampSeconds: { type: "NUMBER", nullable: true },
        },
        required: ["text"],
      },
    },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["ingredients", "steps"],
};

// Caps the timed transcript fed into the prompt by character budget (not
// segment count) so a long video's captions don't blow out the request.
function buildTimedTranscript(segments, charBudget = 8000) {
  if (!segments || segments.length === 0) return "";
  const lines = [];
  let used = 0;
  for (const seg of segments) {
    const line = `[${seg.start.toFixed(1)}s] ${seg.text}`;
    if (used + line.length > charBudget) break;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join("\n");
}

function buildPrompt({ title, description, transcriptSegments, transcript }) {
  const timedTranscript = buildTimedTranscript(transcriptSegments);
  const transcriptBlock = timedTranscript || (transcript || "(없음)").slice(0, 6000);

  return `다음은 유튜브 요리 영상의 제목, 설명란, 자막입니다. 여기서 레시피 정보를 추출해서 JSON으로 정리해주세요.

규칙:
- ingredients: 실제 재료만 포함하고, 손질/조리 방법을 설명하는 문장은 제외하세요. quantity는 숫자만 넣으세요 (분수는 소수로, 예: 1/2 -> 0.5, 범위는 평균값). unit은 "g", "개", "큰술" 같은 단위 텍스트이고 모르면 null. 재료가 "양념"/"소스" 같은 하위 그룹으로 나뉘어 있으면 group에 그 이름을, 없으면 null을 넣으세요.
- steps[].text: 실제 조리 순서 문장만 넣고 번호나 기호는 빼세요.
- steps[].ingredientRefs: 이 단계에서 사용하는 재료들을, 위 ingredients 배열의 인덱스(0부터 시작)로 넣으세요. 해당 없으면 빈 배열.
- steps[].tip: 이 단계에만 해당하는 영상 속 꿀팁/주의사항이 있으면 문장으로, 없으면 null.
- steps[].timerSeconds: 이 단계에 "5분간", "10분 끓이기"처럼 소요 시간이 명시되어 있으면 초 단위 숫자로, 없으면 null.
- steps[].videoTimestampSeconds: 자막 앞에 [12.3s] 같은 시각이 붙어 있으면, 이 단계 설명과 가장 비슷한 내용의 자막이 시작하는 시각(초, 소수 가능)을 넣으세요. 자막이 없거나 매칭되는 부분을 찾기 어려우면 null.
- tips: steps[].tip에 이미 넣은 것 말고, 영상 전체에 걸친 꿀팁/주의사항만 넣고, 채널 홍보·구독 요청·링크·해시태그는 제외하세요.
- baseServings: 재료 목록이 몇 인분 기준인지. 명시되어 있지 않으면 null.
- cookTimeMinutes: 총 조리 시간이 명시되어 있으면 분 단위 숫자, 없으면 null.

제목: ${title || "(없음)"}

설명란:
${description || "(없음)"}

자막${timedTranscript ? " (앞의 [N초] 표시는 자막이 나오는 시각입니다)" : ""}:
${transcriptBlock || "(없음)"}`;
}

async function callGemini(parts, { model } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const resolvedModel = model || process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RECIPE_SCHEMA,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  return JSON.parse(text);
}

export async function parseRecipeWithGemini({ title, description, transcript, transcriptSegments }) {
  if (!process.env.GEMINI_API_KEY) return null;
  return callGemini([{ text: buildPrompt({ title, description, transcript, transcriptSegments }) }]);
}

// Last-resort path: hands Gemini the YouTube URL directly (via file_data —
// no download/ffmpeg needed on our side) so it can watch + listen to the
// video itself when there's no usable description or captions to work
// from. Far more expensive per call (video tokens, not just text) than
// parseRecipeWithGemini, so callers should only reach for this when the
// cheap text path has already come back empty — never as the default.
const VIDEO_PROMPT = `다음 유튜브 요리 영상을 직접 보고 들어서 레시피 정보를 추출해 JSON으로 정리해주세요. 화면에 나오는 자막이나 텍스트, 음성으로 설명하는 내용을 모두 참고하세요.

규칙:
- ingredients: 실제 재료만 포함하고, 손질/조리 방법을 설명하는 문장은 제외하세요. quantity는 숫자만 넣으세요 (분수는 소수로, 예: 1/2 -> 0.5, 범위는 평균값). unit은 "g", "개", "큰술" 같은 단위 텍스트이고 모르면 null. 재료가 "양념"/"소스" 같은 하위 그룹으로 나뉘어 있으면 group에 그 이름을, 없으면 null을 넣으세요.
- steps[].text: 실제 조리 순서 문장만 넣고 번호나 기호는 빼세요.
- steps[].ingredientRefs: 이 단계에서 사용하는 재료들을, 위 ingredients 배열의 인덱스(0부터 시작)로 넣으세요. 해당 없으면 빈 배열.
- steps[].tip: 이 단계에만 해당하는 영상 속 꿀팁/주의사항이 있으면 문장으로, 없으면 null.
- steps[].timerSeconds: 이 단계에 소요 시간이 언급되면 초 단위 숫자로, 없으면 null.
- steps[].videoTimestampSeconds: 이 단계를 설명/시연하는 장면이 영상에서 시작하는 시각(초)을 넣으세요. 알기 어려우면 null.
- tips: steps[].tip에 이미 넣은 것 말고, 영상 전체에 걸친 꿀팁/주의사항만 넣고, 채널 홍보·구독 요청은 제외하세요.
- baseServings: 몇 인분 기준인지. 알 수 없으면 null.
- cookTimeMinutes: 총 조리 시간이 분 단위로 짐작되면 숫자, 없으면 null.`;

export async function parseRecipeFromVideoUrl({ videoUrl, title }) {
  if (!process.env.GEMINI_API_KEY) return null;
  return callGemini(
    [
      { file_data: { file_uri: videoUrl } },
      { text: `${VIDEO_PROMPT}\n\n제목: ${title || "(없음)"}` },
    ],
    { model: process.env.GEMINI_VIDEO_MODEL }
  );
}
