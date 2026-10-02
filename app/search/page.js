"use client";

import { useEffect, useState } from "react";
import BottomTabBar from "@/components/BottomTabBar";
import RecipeCard from "@/components/RecipeCard";
import { search } from "@/lib/storage";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    setResults(search(q));
  }, [q]);

  return (
    <>
      <main className="flex-1 px-5 pb-[110px]">
        <div className="flex justify-between items-center py-[18px] pb-3.5">
          <h1 className="m-0 text-2xl font-black">검색</h1>
        </div>
        <label className="flex items-center gap-2.5 bg-surface border-[1.5px] border-line focus-within:border-main rounded-2xl px-3.5">
          <svg className="w-5 h-5 text-sub">
            <use href="#i-search" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="요리 이름이나 메모로 찾기"
            aria-label="저장한 레시피 검색"
            className="flex-1 border-0 bg-transparent py-3.5 outline-none"
          />
        </label>
        <p className="text-sub text-[13px] mt-2.5 mb-[18px] mx-0.5">저장한 레시피 안에서 찾아요.</p>
        {results.length === 0 ? (
          <div className="col-span-2 bg-surface rounded-2xl p-[22px] text-center text-sub text-sm">
            {q ? `"${q}"에 맞는 저장 레시피가 없어요` : "아직 저장한 레시피가 없어요"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {results.map((r) => (
              <RecipeCard key={r.videoId} recipe={r} variant="grid" />
            ))}
          </div>
        )}
      </main>
      <BottomTabBar />
    </>
  );
}
