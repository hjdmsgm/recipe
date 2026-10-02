"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BottomTabBar from "@/components/BottomTabBar";
import RecipeCard from "@/components/RecipeCard";
import AnalyzingModal from "@/components/AnalyzingModal";
import { extractVideoId } from "@/lib/youtube";
import { getAll, cacheAnalyzed } from "@/lib/storage";

export default function Home() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    setRecent(getAll().slice(0, 8));
  }, []);

  async function handleAnalyze(e) {
    e.preventDefault();
    const videoId = extractVideoId(urlInput);
    if (!videoId) {
      setError("유튜브 링크 형식이 아니에요. youtube.com 또는 youtu.be 주소를 붙여넣어 주세요.");
      return;
    }
    setError("");
    setThumbnail(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
    setDone(false);
    setAnalyzing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzing(false);
        setError(data.error || "분석에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      cacheAnalyzed(videoId, data.recipe);
      setDone(true);
    } catch {
      setAnalyzing(false);
      setError("서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  function handleAnalyzingFinished() {
    const videoId = extractVideoId(urlInput);
    setAnalyzing(false);
    if (videoId) router.push(`/recipe/${videoId}`);
  }

  return (
    <>
      <main className="flex-1 px-5 pb-[110px]">
        <div className="flex items-center py-4">
          <Logo />
        </div>

        <div
          className="-mx-5 px-5 pt-[22px] pb-7"
          style={{
            background:
              "radial-gradient(120% 90% at 100% 0%, var(--color-main-soft), transparent 60%)",
          }}
        >
          <h1 className="text-[26px] leading-[1.35] font-black m-0 mb-2 tracking-[-0.02em]">
            영상 하나로
            <br />
            요리를 시작해보세요!
          </h1>
          <p className="m-0 mb-5 text-sub text-sm">
            유튜브 레시피 링크를 붙여넣으면 따라 하기 쉬운 레시피로 정리해 드려요.
          </p>

          <form onSubmit={handleAnalyze}>
            <div className="flex items-center gap-2.5 bg-surface border-[1.5px] border-line focus-within:border-main rounded-2xl px-3.5 mb-2.5">
              <svg className="w-6 h-6 flex-none">
                <use href="#i-yt" />
              </svg>
              <input
                type="url"
                inputMode="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="YouTube 링크를 붙여넣어 주세요"
                aria-label="유튜브 링크"
                className="flex-1 min-w-0 border-0 bg-transparent py-[15px] outline-none"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full bg-main active:bg-main-deep text-white font-bold text-base rounded-2xl py-[15px]"
            >
              레시피 분석하기
              <svg className="w-5 h-5">
                <use href="#i-arrow" />
              </svg>
            </button>
          </form>
          {error && <p className="text-[#C6361A] text-[13px] mt-2 mx-0.5">{error}</p>}
          <p className="text-sub text-xs mt-2.5 mx-0.5">
            자막(자동 생성 포함)이 있는 영상만 분석할 수 있어요.
          </p>
        </div>

        <div className="flex justify-between items-baseline mt-[30px] mb-3">
          <h2 className="text-lg font-bold m-0">최근 저장한 레시피</h2>
          <button onClick={() => router.push("/saved")} className="text-[13px] text-sub">
            전체 보기
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="bg-surface rounded-2xl p-[22px] text-center text-sub text-sm">
            아직 저장한 레시피가 없어요
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1">
            {recent.map((r) => (
              <RecipeCard key={r.videoId} recipe={r} variant="scroll" />
            ))}
          </div>
        )}

        <div className="flex justify-between items-baseline mt-[30px] mb-3">
          <h2 className="text-lg font-bold m-0">이렇게 요리해요</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["1", "링크 붙여넣기"],
            ["2", "인분 정하기"],
            ["3", "단계별 따라 하기"],
          ].map(([n, label]) => (
            <div key={n} className="bg-surface rounded-xl px-2.5 py-3.5 text-center text-[13px]">
              <b className="block text-main text-lg font-black mb-0.5">{n}</b>
              {label}
            </div>
          ))}
        </div>
      </main>
      <BottomTabBar />
      <AnalyzingModal
        show={analyzing}
        done={done}
        videoUrl={urlInput}
        thumbnail={thumbnail}
        onFinished={handleAnalyzingFinished}
      />
    </>
  );
}
