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
    steps: { type: "ARRAY", items: { type: "STRING" } },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["ingredients", "steps"],
};

function buildPrompt({ title, description, transcript }) {
  return `다음은 유튜브 요리 영상의 제목, 설명란, 자막입니다. 여기서 레시피 정보를 추출해서 JSON으로 정리해주세요.

규칙:
- ingredients: 실제 재료만 포함하고, 손질/조리 방법을 설명하는 문장은 제외하세요. quantity는 숫자만 넣으세요 (분수는 소수로, 예: 1/2 -> 0.5, 범위는 평균값). unit은 "g", "개", "큰술" 같은 단위 텍스트이고 모르면 null. 재료가 "양념"/"소스" 같은 하위 그룹으로 나뉘어 있으면 group에 그 이름을, 없으면 null을 넣으세요.
- steps: 실제 조리 순서 문장만 넣고 번호나 기호는 빼세요.
- tips: 영상에서 언급한 꿀팁/주의사항만 넣고, 채널 홍보·구독 요청·링크·해시태그는 제외하세요.
- baseServings: 재료 목록이 몇 인분 기준인지. 명시되어 있지 않으면 null.
- cookTimeMinutes: 총 조리 시간이 명시되어 있으면 분 단위 숫자, 없으면 null.

제목: ${title || "(없음)"}

설명란:
${description || "(없음)"}

자막:
${(transcript || "(없음)").slice(0, 6000)}`;
}

export async function parseRecipeWithGemini({ title, description, transcript }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt({ title, description, transcript }) }] }],
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
