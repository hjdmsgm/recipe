import { NextResponse } from "next/server";
import { extractVideoId, fetchVideoData } from "@/lib/youtube";
import { buildRecipe, buildRecipeFromAi } from "@/lib/parser";
import { parseRecipeWithGemini } from "@/lib/gemini";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const { url, manualDescription } = body || {};
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "유튜브 URL을 입력해주세요." }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "올바른 유튜브 URL이 아니에요." }, { status: 400 });
  }

  try {
    const data = await fetchVideoData(videoId);

    // YouTube sometimes gates the scrape (bot-check) on server IPs, leaving
    // description/captions empty — let the user paste the description in
    // themselves instead of being stuck.
    if (typeof manualDescription === "string" && manualDescription.trim()) {
      data.description = manualDescription.trim();
    }

    if (!data.title && !data.description && !data.transcript) {
      return NextResponse.json(
        { error: "영상 정보를 가져오지 못했어요. 비공개 영상이거나 존재하지 않는 영상일 수 있어요." },
        { status: 404 }
      );
    }
    let recipe = null;
    let geminiDebug = null;
    try {
      const ai = await parseRecipeWithGemini({
        title: data.title,
        description: data.description,
        transcript: data.transcript,
      });
      if (ai && Array.isArray(ai.ingredients) && ai.ingredients.length) {
        recipe = buildRecipeFromAi(ai, data);
      } else {
        geminiDebug = { stage: "empty-result", ai };
      }
    } catch (err) {
      console.error("Gemini parsing failed, falling back to rule-based parser:", err);
      geminiDebug = { stage: "threw", error: String(err && err.message ? err.message : err) };
    }

    if (!recipe) recipe = buildRecipe(data);

    // Neither captions nor the description gave us anything to work with —
    // this video would need audio/frame analysis (not implemented) to do
    // better. Surface that clearly instead of silently showing an empty list.
    recipe.insufficientInfo = !recipe.hasTranscript && !recipe.hasIngredients;

    return NextResponse.json({ recipe, _geminiDebug: geminiDebug });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "영상 정보를 가져오는 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
