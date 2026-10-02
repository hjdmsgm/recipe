"use client";

import { useEffect, useState } from "react";
import BottomTabBar from "@/components/BottomTabBar";
import RecipeCard from "@/components/RecipeCard";
import { getAll } from "@/lib/storage";

export default function SavedPage() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    setRecipes(getAll());
  }, []);

  return (
    <>
      <main className="flex-1 px-5 pb-[110px]">
        <div className="flex justify-between items-center py-[18px] pb-3.5">
          <h1 className="m-0 text-2xl font-black">저장한 레시피</h1>
        </div>
        <p className="text-sub text-[13px] mb-3">
          <b className="text-main">{recipes.length}</b>개의 레시피
        </p>
        {recipes.length === 0 ? (
          <div className="bg-surface rounded-2xl p-[22px] text-center text-sub text-sm">
            아직 저장한 레시피가 없어요
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recipes.map((r) => (
              <RecipeCard key={r.videoId} recipe={r} variant="grid" />
            ))}
          </div>
        )}
      </main>
      <BottomTabBar />
    </>
  );
}
