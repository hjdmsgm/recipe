"use client";

import { useEffect, useRef, useState } from "react";
import TimerRing from "./TimerRing";
import { scaleQuantity, formatQuantity } from "@/lib/format";

function mmss(s) {
  const sec = Math.max(0, Math.round(s));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function CookMode({
  recipe,
  title,
  baseServings,
  servings,
  saved,
  videoId,
  onClose,
  onFinishSave,
  onFinishSkip,
}) {
  const steps = recipe.steps;
  const total = steps.length;
  const [cur, setCur] = useState(0);
  const [timer, setTimer] = useState({ stepIndex: -1, left: 0, total: 0, running: false });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [finishMemo, setFinishMemo] = useState("");
  const wakeLockRef = useRef(null);
  const touchStartX = useRef(null);
  const scrollRef = useRef(null);

  const finished = cur >= total;
  const step = !finished ? steps[cur] : null;

  // Wake Lock: keep the screen on while cooking, release on exit.
  useEffect(() => {
    if (!("wakeLock" in navigator)) {
      setWakeLockSupported(false);
      return;
    }
    let cancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        if (cancelled) lock.release().catch(() => {});
        else wakeLockRef.current = lock;
      })
      .catch(() => setWakeLockSupported(false));
    return () => {
      cancelled = true;
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  // One global timer tick, independent of which step is currently shown.
  useEffect(() => {
    if (!timer.running) return;
    const iv = setInterval(() => {
      setTimer((t) => {
        if (!t.running) return t;
        const left = t.left - 1;
        if (left <= 0) {
          if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
          return { ...t, left: 0, running: false };
        }
        return { ...t, left };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [timer.running]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [cur]);

  function startTimerForStep(index, seconds) {
    setTimer({ stepIndex: index, left: seconds, total: seconds, running: true });
  }
  function toggleTimer() {
    setTimer((t) => (t.left <= 0 ? { ...t, stepIndex: -1 } : { ...t, running: !t.running }));
  }

  function goPrev() {
    if (cur > 0) setCur((c) => c - 1);
  }
  function goNext() {
    if (cur < total) setCur((c) => c + 1);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -60) goNext();
    else if (dx > 60) goPrev();
  }

  const showMiniTimer = timer.stepIndex >= 0 && timer.stepIndex !== cur;

  return (
    <div className="fixed inset-0 z-30 bg-dark text-white flex flex-col" role="dialog" aria-label="요리 모드">
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ touchAction: "pan-y" }}>
        <div className="max-w-[480px] mx-auto">
          <div
            className="relative bg-line"
            style={{ height: "30vh", minHeight: "190px" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {recipe.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.thumbnail} alt="" className="w-full h-full object-cover" />
            )}
            <div
              className="absolute inset-0 z-[1]"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(23,23,23,.55), transparent 35%, transparent 55%, var(--color-dark))",
              }}
            />
            <div
              className="absolute top-0 left-0 right-0 z-[2] flex items-center justify-between px-4"
              style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}
            >
              <button
                onClick={onClose}
                aria-label="요리 모드 나가기"
                className="w-10 h-10 grid place-items-center rounded-full bg-black/35"
              >
                <svg className="w-5 h-5">
                  <use href="#i-x" />
                </svg>
              </button>
              <span className="font-bold text-sm tracking-wide">
                {finished ? "완성" : `STEP ${String(cur + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
              </span>
              <button
                onClick={() => setSheetOpen(true)}
                aria-label="이 단계 영상 보기"
                className="w-10 h-10 grid place-items-center rounded-full bg-black/35"
                style={{ visibility: finished ? "hidden" : "visible" }}
              >
                <svg className="w-5 h-5">
                  <use href="#i-play" />
                </svg>
              </button>
            </div>
            {!wakeLockSupported && (
              <span className="absolute left-4 bottom-2.5 z-[2] text-[11px] text-[#CFCFCF]">
                이 브라우저는 화면 꺼짐 방지를 지원하지 않아요
              </span>
            )}
          </div>

          <div className="flex gap-1 px-5 mt-1">
            {steps.map((_, i) => (
              <span key={i} className={`flex-1 h-1 rounded-full ${i <= cur ? "bg-main" : "bg-dark-line"}`} />
            ))}
          </div>

          {showMiniTimer && (
            <div className="flex items-center justify-between mx-5 mt-3 bg-main rounded-xl px-3.5 py-2.5 text-[13px] font-bold">
              <span>{timer.stepIndex + 1}단계 타이머</span>
              <span className="text-lg tabular-nums">{timer.left <= 0 ? "끝!" : mmss(timer.left)}</span>
              <button
                onClick={() => (timer.left <= 0 ? setTimer((t) => ({ ...t, stepIndex: -1 })) : toggleTimer())}
                className="bg-black/18 rounded-lg px-2.5 py-1 text-xs"
              >
                {timer.left <= 0 ? "닫기" : timer.running ? "일시정지" : "계속"}
              </button>
            </div>
          )}

          <div className="px-5 pt-4 pb-6">
            {finished ? (
              <FinishBody
                title={title}
                servings={servings}
                saved={saved}
                finishMemo={finishMemo}
                setFinishMemo={setFinishMemo}
                onFinishSave={onFinishSave}
                onFinishSkip={onFinishSkip}
              />
            ) : (
              <StepBody
                step={step}
                index={cur}
                recipe={recipe}
                baseServings={baseServings}
                servings={servings}
                timer={timer}
                onStartTimer={(seconds) => startTimerForStep(cur, seconds)}
                onToggleTimer={toggleTimer}
                onWatch={() => setSheetOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {!finished && (
        <div
          className="max-w-[480px] w-full mx-auto grid gap-2.5 px-5"
          style={{ gridTemplateColumns: "1fr 1.6fr", paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))", paddingTop: "12px" }}
        >
          <button
            onClick={goPrev}
            disabled={cur === 0}
            className="rounded-2xl py-[15px] font-bold flex items-center justify-center gap-1.5 border-[1.5px] border-dark-line disabled:opacity-35"
          >
            <svg className="w-[18px] h-[18px]">
              <use href="#i-left" />
            </svg>
            이전
          </button>
          <button onClick={goNext} className="rounded-2xl py-[15px] font-bold flex items-center justify-center gap-1.5 bg-main">
            {cur === total - 1 ? "완성" : "다음"}
            <svg className="w-[18px] h-[18px]">
              <use href="#i-arrow" />
            </svg>
          </button>
        </div>
      )}

      {sheetOpen && (
        <VideoSheet videoId={videoId} timestamp={step?.videoTimestampSeconds} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}

function StepBody({ step, recipe, baseServings, servings, timer, onStartTimer, onToggleTimer, onWatch }) {
  const chips = (step.ingredientRefs || [])
    .map((i) => recipe.ingredients[i])
    .filter(Boolean);
  const isThisStepTimer = timer.stepIndex >= 0 && timer.left > 0;

  return (
    <div>
      <h2 className="text-[25px] leading-[1.4] font-black m-0 mb-4" style={{ wordBreak: "keep-all" }}>
        {step.text}
      </h2>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {chips.map((ing) => (
            <span key={ing.id} className="bg-dark-card rounded-full px-[13px] py-[7px] text-sm">
              {ing.name}
              <b className="text-main ml-1.5">
                {formatQuantity(scaleQuantity(ing.quantity, baseServings, servings))}
                {ing.unit}
              </b>
            </span>
          ))}
        </div>
      )}

      {step.tip && (
        <div className="border-[1.5px] border-main bg-main/10 rounded-2xl px-3.5 py-3 text-sm mb-[18px]">
          <strong className="flex items-center gap-1.5 text-main text-[13px] mb-0.5">
            <span className="w-4 h-4 rounded-full bg-main text-white text-[11px] font-black grid place-items-center">!</span>
            영상 TIP
          </strong>
          {step.tip}
        </div>
      )}

      {step.timerSeconds &&
        (step.timerSeconds && (
          <TimerRing
            left={
              timer.stepIndex === -1 || !isThisStepTimer
                ? step.timerSeconds
                : timer.left
            }
            total={step.timerSeconds}
            running={timer.running && isThisStepTimer}
            onToggle={() => (isThisStepTimer ? onToggleTimer() : onStartTimer(step.timerSeconds))}
          />
        ))}

      <button
        onClick={onWatch}
        className="flex items-center justify-center gap-2 w-full border-[1.5px] border-dark-line rounded-2xl py-[13px] font-bold text-sm"
      >
        <svg className="w-[18px] h-[18px]">
          <use href="#i-yt" />
        </svg>
        이 단계 영상으로 보기
      </button>
    </div>
  );
}

function FinishBody({ title, servings, saved, finishMemo, setFinishMemo, onFinishSave, onFinishSkip }) {
  return (
    <div>
      <div className="text-center pt-[30px] pb-2.5">
        <h2 className="text-[30px] font-black m-0 mb-1.5">완성!</h2>
        <p className="text-dark-sub m-0">
          {servings}인분 {title}을 다 만들었어요.
        </p>
        {saved && (
          <span className="inline-flex items-center gap-1.5 mt-5 bg-dark-card rounded-full px-4 py-2.5 text-sm">
            <svg className="w-4 h-4 text-main" fill="currentColor">
              <use href="#i-heart" />
            </svg>
            저장 목록에 있는 레시피예요
          </span>
        )}
      </div>
      {!saved && (
        <div className="bg-dark-card rounded-[18px] p-[18px] mt-6 text-left">
          <h3 className="m-0 mb-1 text-lg font-black">이 레시피, 저장해 둘까요?</h3>
          <p className="m-0 mb-3 text-dark-sub text-[13px]">{servings}인분 설정 그대로 저장 목록에 넣어 둘게요.</p>
          <input
            value={finishMemo}
            onChange={(e) => setFinishMemo(e.target.value)}
            maxLength={30}
            placeholder="한 줄 메모 (선택) 예: 다음엔 덜 맵게"
            className="w-full border-0 rounded-xl bg-dark px-3.5 py-3 mb-3 placeholder:text-[#7A7A7A]"
          />
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1.6fr" }}>
            <button onClick={onFinishSkip} className="rounded-xl py-[13px] font-bold border-[1.5px] border-dark-line text-dark-sub">
              괜찮아요
            </button>
            <button onClick={() => onFinishSave(finishMemo.trim())} className="rounded-xl py-[13px] font-bold bg-main">
              저장하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoSheet({ videoId, timestamp, onClose }) {
  const start = Math.max(0, Math.round((timestamp || 0) - 3));
  return (
    <>
      <div className="fixed inset-0 bg-black/55 z-[44]" onClick={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 z-[45] bg-[#0E0E0E] text-white rounded-t-[22px] px-4 pt-2.5 max-w-[480px] mx-auto"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="w-10 h-[5px] rounded-full bg-[#444] mx-auto mb-3" />
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?start=${start}&autoplay=1`}
            title="영상 보기"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
        <div className="flex justify-between items-center mt-3 text-sm">
          <span>{timestamp ? `${mmss(start)}부터 재생` : "처음부터 재생"}</span>
          <div className="flex gap-2">
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noreferrer"
              className="bg-[#262626] rounded-lg px-3.5 py-2"
            >
              유튜브에서 보기
            </a>
            <button onClick={onClose} className="bg-[#262626] rounded-lg px-3.5 py-2">
              닫기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
