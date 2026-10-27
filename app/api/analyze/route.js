import { NextResponse } from "next/server";
import { extractVideoId, fetchVideoData } from "@/lib/youtube";
import { buildRecipe, buildRecipeFromAi } from "@/lib/parser";
import { parseRecipeWithGemini, parseRecipeFromVideoUrl } from "@/lib/gemini";

// 앱인토스 미니앱(minirecipe)에서 호출하기 위한 CORS 허용 Origin.
// 실서비스·QR 테스트 Origin은 SDK 버전에 따라 달라서 두 계열을 모두 둔다.
const ALLOWED_ORIGINS = new Set([
  "https://minirecipe.apps.tossmini.com",
  "https://minirecipe.private-apps.tossmini.com",
  "https://minirecipe.web.tossmini.com",
  "https://minirecipe.private-web.tossmini.com",
  "http://localhost:5173",
  "http://localhost:5174",
]);

function corsHeaders(request) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-anon-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request) {
  const response = await handlePost(request);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(key, value);
  }
  return response;
}

async function handlePost(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청을 처리하지 못했어요. 앱을 다시 열어 시도해 주세요." }, { status: 400 });
  }

  const { url, manualDescription, videoMode } = body || {};
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "유튜브 링크를 붙여넣어 주세요." }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "유튜브 링크 형식이 아니에요. youtube.com 또는 youtu.be 주소를 붙여넣어 주세요." }, { status: 400 });
  }

  try {
    const data = await fetchVideoData(videoId);

    // Last resort: hand Gemini the YouTube URL itself and let it watch/
    // listen to the video — much more expensive per call than the text
    // path below, so this only runs when the caller explicitly asks for it
    // (the UI only offers that button once the cheap path has come up
    // empty), never automatically.
    if (videoMode) {
      let videoRecipe = null;
      try {
        const ai = await parseRecipeFromVideoUrl({ videoUrl: `https://www.youtube.com/watch?v=${videoId}`, title: data.title });
        if (ai && Array.isArray(ai.ingredients) && ai.ingredients.length) {
          videoRecipe = buildRecipeFromAi(ai, data);
        }
      } catch (err) {
        console.error("Gemini video analysis failed:", err);
        return NextResponse.json(
          { error: "영상을 직접 분석하지 못했어요. 잠시 후 다시 시도해 주세요." },
          { status: 502 }
        );
      }
      if (!videoRecipe) {
        return NextResponse.json(
          { error: "영상을 분석했지만 재료를 찾지 못했어요. 요리 과정이 담긴 영상인지 확인해 주세요." },
          { status: 404 }
        );
      }
      videoRecipe.insufficientInfo = false;
      videoRecipe.source = "ai-video";
      return NextResponse.json({ recipe: videoRecipe });
    }

    // YouTube sometimes gates the scrape (bot-check) on server IPs, leaving
    // description/captions empty — let the user paste the description in
    // themselves instead of being stuck.
    if (typeof manualDescription === "string" && manualDescription.trim()) {
      data.description = manualDescription.trim();
    }

    if (!data.title && !data.description && !data.transcript) {
      return NextResponse.json(
        { error: "영상 정보를 가져오지 못했어요. 비공개이거나 삭제된 영상일 수 있어요. 링크를 다시 확인해 주세요." },
        { status: 404 }
      );
    }
    let recipe = null;
    try {
      const ai = await parseRecipeWithGemini({
        title: data.title,
        description: data.description,
        transcript: data.transcript,
        transcriptSegments: data.transcriptSegments,
      });
      if (ai && Array.isArray(ai.ingredients) && ai.ingredients.length) {
        recipe = buildRecipeFromAi(ai, data);
      }
    } catch (err) {
      console.error("Gemini parsing failed, falling back to rule-based parser:", err);
    }

    if (!recipe) recipe = buildRecipe(data);

    // Neither captions nor the description gave us anything to work with.
    // The frontend offers a "watch the video directly" button in this case
    // (videoMode above) instead of silently showing an empty list.
    recipe.insufficientInfo = !recipe.hasTranscript && !recipe.hasIngredients;

    return NextResponse.json({ recipe });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "영상 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
