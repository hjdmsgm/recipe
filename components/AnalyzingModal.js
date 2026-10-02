"use client";

import { useEffect, useRef, useState } from "react";

const STAGES = ["영상 정보 확인", "자막 가져오기", "재료 추출", "조리 과정 분석", "영상 팁 찾기"];

// There's really just one API call happening behind this, so the 5-stage
// checklist is a time-based fake progress indicator (per the product spec)
// — it advances on a timer and gets fast-forwarded to "done" once the real
// response (`done` prop) arrives.
export default function AnalyzingModal({ show, done, videoUrl, thumbnail, onFinished }) {
  const [stage, setStage] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!show) {
      setStage(0);
      finishedRef.current = false;
      return;
    }
    const iv = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 650);
    return () => clearInterval(iv);
  }, [show]);

  useEffect(() => {
    if (!show || !done || finishedRef.current) return;
    finishedRef.current = true;
    setStage(STAGES.length);
    const t = setTimeout(() => onFinished?.(), 500);
    return () => clearTimeout(t);
  }, [show, done, onFinished]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-40 bg-dark/72 flex items-center justify-center p-5" role="dialog" aria-label="레시피 분석 중">
      <div className="bg-surface rounded-[24px] px-5 pt-[26px] pb-[22px] w-full max-w-[400px] text-center">
        <svg
          className="w-14 h-14 mx-auto mb-2.5 text-main"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M8 22h32v10a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" />
          <path d="M4 24h4M40 24h4M18 22v-3h12v3" />
          <path d="M19 12c0-3 3-3 3-6M26 12c0-3 3-3 3-6" opacity=".6" />
        </svg>
        <h2 className="m-0 mb-1 text-xl font-black">레시피를 분석하고 있어요</h2>
        <p className="m-0 mb-[18px] text-sub text-sm">영상 길이에 따라 30초 정도 걸려요.</p>

        <div className="flex items-center gap-2.5 bg-bg rounded-xl p-2 mb-3.5 text-left">
          <div className="flex-none w-16 h-11 rounded-lg bg-line overflow-hidden">
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <span className="text-xs text-sub whitespace-nowrap overflow-hidden text-ellipsis">{videoUrl}</span>
        </div>

        <ul className="list-none m-0 p-0 text-left">
          {STAGES.map((label, i) => {
            const isDone = i < stage;
            const isNow = i === stage;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm ${
                  isNow ? "bg-main-soft font-bold text-ink" : isDone ? "text-ink" : "text-sub"
                }`}
              >
                <span
                  className={`w-[22px] h-[22px] rounded-full border-2 flex-none grid place-items-center ${
                    isDone ? "bg-main border-main" : isNow ? "border-main border-[3px]" : "border-line"
                  }`}
                >
                  {isDone && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 10 6" fill="none">
                      <path d="M1 3l2.5 2.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                {label}
                <span className="ml-auto text-xs">{isDone ? "완료" : isNow ? "진행 중" : ""}</span>
              </li>
            );
          })}
        </ul>

        <div className="h-1.5 bg-line rounded-full my-4 overflow-hidden">
          <div
            className="h-full bg-main transition-[width] duration-500"
            style={{ width: `${(Math.min(stage, STAGES.length) / STAGES.length) * 100}%` }}
          />
        </div>
        <p className="m-0 text-[13px] text-sub">잠시만 기다려 주세요.</p>
      </div>
    </div>
  );
}
