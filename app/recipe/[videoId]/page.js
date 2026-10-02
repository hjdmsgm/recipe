"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ServingsStepper from "@/components/ServingsStepper";
import IngredientList from "@/components/IngredientList";
import TipList from "@/components/TipList";
import StepList from "@/components/StepList";
import CookMode from "@/components/cook/CookMode";
import { getByVideoId, getCachedAnalyzed, save, remove } from "@/lib/storage";

const TABS = ["ing", "tip", "step"];
const TAB_LABEL = { ing: "재료", tip: "영상 팁", step: "순서" };
const NEXT_TAB = { ing: "tip", tip: "step" };

export default function RecipeDetail() {
  const { videoId } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [saved, setSaved] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoCharCount, setMemoCharCount] = useState(0);
  const [servings, setServings] = useState(2);
  const [activeTab, setActiveTab] = useState("ing");
  const [cookOpen, setCookOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [heartPop, setHeartPop] = useState(false);
  const [videoAnalyzing, setVideoAnalyzing] = useState(false);
  const [videoAnalyzeError, setVideoAnalyzeError] = useState("");
  const toastTimer = useRef(null);
  const tabsRef = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }

  useEffect(() => {
    if (!videoId) return;

    const existing = getByVideoId(videoId);
    if (existing) {
      setRecipe(existing.recipe);
      setSaved(true);
      setMemo(existing.memo || "");
      setMemoCharCount((existing.memo || "").length);
      setServings(existing.servings ?? existing.recipe.baseServings);
      setStatus("ready");
      return;
    }

    const cached = getCachedAnalyzed(videoId);
    if (cached) {
      setRecipe(cached);
      setSaved(false);
      setServings(cached.baseServings);
      setStatus("ready");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "레시피를 불러오지 못했어요.");
          setStatus("error");
          return;
        }
        setRecipe(data.recipe);
        setServings(data.recipe.baseServings);
        setStatus("ready");
      } catch {
        setErrorMsg("서버에 연결하지 못했어요.");
        setStatus("error");
      }
    })();
  }, [videoId]);

  function persist(patch) {
    return save(videoId, {
      title: recipe.title,
      channel: recipe.channel,
      thumbnail: recipe.thumbnail,
      recipe,
      servings,
      memo,
      ...patch,
    });
  }

  function handleToggleSave() {
    if (saved) {
      remove(videoId);
      setSaved(false);
      showToast("저장 목록에서 뺐어요");
    } else {
      persist({});
      setSaved(true);
      setHeartPop(true);
      setTimeout(() => setHeartPop(false), 350);
      showToast("저장 목록에 추가했어요");
    }
  }

  function handleMemoChange(value) {
    setMemo(value);
    setMemoCharCount(value.length);
    if (saved) {
      persist({ memo: value });
    } else if (value.trim()) {
      persist({ memo: value });
      setSaved(true);
      showToast("메모와 함께 저장했어요");
    }
  }

  function handleServingsChange(next) {
    setServings(next);
    if (saved) persist({ servings: next });
  }

  async function handleAnalyzeVideoDirect() {
    if (videoAnalyzing) return;
    setVideoAnalyzing(true);
    setVideoAnalyzeError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, videoMode: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVideoAnalyzeError(data.error || "영상 분석에 실패했어요.");
        return;
      }
      setRecipe(data.recipe);
      setServings(data.recipe.baseServings);
    } catch {
      setVideoAnalyzeError("서버에 연결하지 못했어요.");
    } finally {
      setVideoAnalyzing(false);
    }
  }

  function selectTab(tab) {
    setActiveTab(tab);
    const top = tabsRef.current?.getBoundingClientRect().top;
    if (top != null && top < 0) window.scrollBy(0, top);
  }

  function handleCookFinishSave(finishMemo) {
    const finalMemo = finishMemo || memo;
    setMemo(finalMemo);
    persist({ memo: finalMemo });
    setSaved(true);
    setCookOpen(false);
    router.push(`/saved?justSaved=${videoId}`);
  }

  if (status === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center text-sub text-sm">레시피를 불러오는 중이에요...</main>
    );
  }
  if (status === "error") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-sub text-sm">{errorMsg}</p>
        <button onClick={() => router.push("/")} className="text-main font-bold text-sm">
          홈으로 가기
        </button>
      </main>
    );
  }

  const stepCount = recipe.steps.length;
  // The "영상 팁" tab shows both the overall video tips and any per-step
  // tips (step.tip) — otherwise a tip that only got attached to one step
  // (e.g. via the rule-based parser's trailing-parenthetical heuristic)
  // would never surface anywhere outside Cook Mode.
  const allTips = [...recipe.tips, ...recipe.steps.map((s) => s.tip).filter(Boolean)];

  return (
    <div className="pb-[110px]">
      <div className="-mx-5" style={{ height: "250px", position: "relative" }}>
        {recipe.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.thumbnail} alt="" className="w-full h-full object-cover" />
        )}
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          className="absolute left-4 top-3.5 w-10 h-10 rounded-full bg-white/92 text-ink grid place-items-center"
        >
          <svg className="w-5 h-5">
            <use href="#i-left" />
          </svg>
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          className="absolute right-4 bottom-3.5 flex items-center gap-1.5 bg-white/92 text-ink rounded-full px-3 py-[7px] text-xs font-bold"
        >
          <svg className="w-4 h-4">
            <use href="#i-yt" />
          </svg>
          원본 영상 보기
        </a>
      </div>

      <div className="bg-surface -mt-[22px] mx-0 rounded-t-[22px] px-5 pt-[22px] pb-1 relative">
        <h1 className="m-0 text-2xl font-black tracking-[-0.02em]">{recipe.title || "제목 없음"}</h1>
        {recipe.channel && <p className="text-sub text-[13px] mt-0.5 mb-2.5">{recipe.channel}</p>}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-sub text-[13px]">
          {recipe.cookTimeMinutes && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-[15px] h-[15px]">
                <use href="#i-clock" />
              </svg>
              {recipe.cookTimeMinutes}분
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <svg className="w-[15px] h-[15px]">
              <use href="#i-users" />
            </svg>
            영상 기준 {recipe.baseServings}인분
          </span>
          <span>단계 {stepCount}개</span>
        </div>

        <div className="mt-4 mb-1 border-[1.5px] border-main rounded-2xl overflow-hidden">
          <button
            onClick={handleToggleSave}
            aria-pressed={saved}
            className={`flex items-center justify-center gap-2 w-full py-[13px] font-bold text-base transition-colors ${
              saved ? "bg-main text-white" : "bg-surface text-main"
            }`}
          >
            <svg
              className={`w-5 h-5 ${heartPop ? "animate-[pop_.35s_ease]" : ""}`}
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <use href="#i-heart" />
            </svg>
            {saved ? "저장된 레시피" : "내 레시피에 저장"}
          </button>
          <div className="flex items-center gap-2 px-3.5 border-t border-line bg-surface">
            <label htmlFor="memo" className="text-[13px] font-bold text-main whitespace-nowrap">
              메모
            </label>
            <input
              id="memo"
              value={memo}
              onChange={(e) => handleMemoChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              maxLength={30}
              placeholder="한 줄로 남겨요. 예: 다음엔 덜 맵게"
              className="flex-1 min-w-0 border-0 bg-transparent text-sm py-[11px] outline-none"
            />
            <span className="text-[11px] text-sub tabular-nums">{memoCharCount}/30</span>
          </div>
        </div>
      </div>

      {recipe.insufficientInfo && (
        <div className="mx-5 mt-4 rounded-2xl bg-main-soft px-4 py-3.5 text-sm">
          <p className="m-0 text-main-deep">
            이 영상은 자막도, 설명란에 재료 정보도 없어서 텍스트만으로는 레시피를 찾기 어려워요.
          </p>
          <button
            type="button"
            onClick={handleAnalyzeVideoDirect}
            disabled={videoAnalyzing}
            className="mt-2.5 flex items-center justify-center gap-2 w-full bg-main text-white font-bold rounded-xl py-2.5 disabled:opacity-50"
          >
            {videoAnalyzing ? "AI가 영상을 보는 중... (시간이 좀 걸려요)" : "AI가 영상을 직접 보고 분석하기"}
          </button>
          {videoAnalyzeError && <p className="mt-2 text-main-deep">{videoAnalyzeError}</p>}
        </div>
      )}

      <ServingsStepper servings={servings} onChange={handleServingsChange} />

      <div
        ref={tabsRef}
        role="tablist"
        aria-label="레시피 내용"
        className="sticky z-[5] bg-surface -mx-5 px-5 border-b border-line grid grid-cols-3"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => selectTab(tab)}
            className={`py-3.5 pb-3 text-[15px] -mb-px border-b-[2.5px] ${
              activeTab === tab ? "text-main font-bold border-main" : "text-sub font-medium border-transparent"
            }`}
          >
            {TAB_LABEL[tab]}
            <span className="text-xs ml-0.5">
              {tab === "ing" ? recipe.ingredients.length : tab === "tip" ? allTips.length : stepCount}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-surface -mx-5 px-5 pt-2 pb-6">
        {activeTab === "ing" && (
          <>
            <IngredientList ingredients={recipe.ingredients} baseServings={recipe.baseServings} servings={servings} />
            <button onClick={() => selectTab("tip")} className="block ml-auto mt-4 text-main font-bold text-sm">
              영상 팁 보기
            </button>
          </>
        )}
        {activeTab === "tip" && (
          <>
            <TipList tips={allTips} />
            <button onClick={() => selectTab("step")} className="block ml-auto mt-4 text-main font-bold text-sm">
              만드는 순서 보기
            </button>
          </>
        )}
        {activeTab === "step" && <StepList steps={recipe.steps} />}
      </div>

      <div
        className="fixed left-0 right-0 bottom-0 z-20 px-5"
        style={{
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          paddingTop: "12px",
          background: "linear-gradient(to top, var(--color-bg) 75%, transparent)",
        }}
      >
        <button
          onClick={() => setCookOpen(true)}
          disabled={stepCount === 0}
          className="max-w-[440px] mx-auto flex items-center justify-center gap-2 w-full bg-main text-white font-bold text-[17px] rounded-2xl py-4 disabled:opacity-40"
          style={{ boxShadow: "0 8px 20px rgba(255,104,53,.35)" }}
        >
          <svg className="w-5 h-5">
            <use href="#i-hat" />
          </svg>
          요리 시작하기
        </button>
      </div>

      {cookOpen && (
        <CookMode
          recipe={recipe}
          title={recipe.title}
          baseServings={recipe.baseServings}
          servings={servings}
          saved={saved}
          videoId={videoId}
          onClose={() => setCookOpen(false)}
          onFinishSave={handleCookFinishSave}
          onFinishSkip={() => setCookOpen(false)}
        />
      )}

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 bg-ink text-bg px-[18px] py-[11px] rounded-full text-sm font-medium whitespace-nowrap"
          style={{ bottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
