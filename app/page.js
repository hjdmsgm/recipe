"use client";

import { useState } from "react";
import { scaleQuantity, formatQuantity } from "@/lib/format";

let nextId = 1000;

function groupIcon(label) {
  if (!label) return "🥕";
  if (/양념|소스|드레싱|다대기|초장|쌈장/.test(label)) return "🥣";
  if (/육수/.test(label)) return "🍲";
  return "🧂";
}

function displayAmount(ing, baseServings, targetServings) {
  if (ing.quantity == null) return ing.unit || "-";
  const scaled = scaleQuantity(ing.quantity, baseServings, targetServings);
  return `${formatQuantity(scaled)}${ing.unit}`;
}

function groupIngredients(ingredients) {
  const order = [];
  const map = new Map();
  for (const ing of ingredients) {
    const key = ing.group || "";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key).push(ing);
  }
  return order.map((key) => ({ label: key || null, items: map.get(key) }));
}

export default function Home() {
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [baseServings, setBaseServings] = useState(2);
  const [targetServings, setTargetServings] = useState(2);
  const [showRawDescription, setShowRawDescription] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [manualDescription, setManualDescription] = useState("");
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function runAnalyze({ manualDescription: manualDesc } = {}) {
    const url = urlInput.trim();
    if (!url) return;
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualDesc ? { url, manualDescription: manualDesc } : { url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "알 수 없는 오류가 발생했어요.");
        return;
      }
      setRecipe(data.recipe);
      setIngredients(data.recipe.ingredients);
      setBaseServings(data.recipe.baseServings);
      setTargetServings(data.recipe.baseServings);
      setShowRawDescription(false);
      setShowManualPaste(false);
      setEditMode(!data.recipe.hasIngredients);
    } catch {
      setError("서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!urlInput.trim() || loading) return;
    setLoading(true);
    setRecipe(null);
    await runAnalyze();
    setLoading(false);
  }

  async function handleManualRetry() {
    if (!manualDescription.trim() || retrying) return;
    setRetrying(true);
    await runAnalyze({ manualDescription });
    setRetrying(false);
  }

  function ratio() {
    return baseServings > 0 ? targetServings / baseServings : 1;
  }

  function updateIngredient(id, field, value) {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        if (field === "displayQuantity") {
          const num = value === "" ? null : parseFloat(value);
          const base =
            num == null || Number.isNaN(num) ? null : num / (ratio() || 1);
          return { ...ing, quantity: base };
        }
        return { ...ing, [field]: value };
      })
    );
  }

  function removeIngredient(id) {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  }

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      { id: nextId++, name: "", quantity: null, unit: "", note: undefined, group: null },
    ]);
  }

  function adjustServings(delta) {
    setTargetServings((prev) => Math.max(1, prev + delta));
  }

  const ingredientGroups = recipe ? groupIngredients(ingredients) : [];

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          레시피 인분 계산기
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          유튜브 레시피 영상 링크를 넣으면 설명란과 자막에서 재료를 찾아드려요.
          원하는 인분 수를 입력하면 재료량이 자동으로 계산돼요.
        </p>
      </header>

      <form onSubmit={handleAnalyze} className="flex gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={loading || !urlInput.trim()}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "분석 중..." : "분석하기"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {recipe && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="p-6">
            <div className="flex gap-4">
              {recipe.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.thumbnail}
                  alt=""
                  className="h-20 w-32 flex-shrink-0 rounded-lg object-cover bg-neutral-200"
                />
              )}
              <div className="min-w-0">
                <h2 className="font-bold text-lg leading-snug line-clamp-2">
                  {recipe.title || "제목 없음"}
                </h2>
                <a
                  href={`https://www.youtube.com/watch?v=${recipe.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neutral-500 hover:underline"
                >
                  원본 영상 보기 ↗
                </a>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-500">
                  {recipe.cookTimeMinutes && <span>⏱ {recipe.cookTimeMinutes}분</span>}
                  <span>👥 {targetServings}인분</span>
                </div>
              </div>
            </div>

            {recipe.insufficientInfo ? (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                <p>
                  이 영상은 자막도 없고 설명란에도 재료 정보가 없어서, 텍스트만으로는
                  레시피를 찾기 어려워요. 유튜브 페이지에서 설명란을 직접 복사해
                  붙여넣으시면 그걸로 다시 분석해볼게요.
                </p>
                {showManualPaste ? (
                  <div className="mt-3">
                    <textarea
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      placeholder="유튜브 영상 설명란 내용을 여기에 붙여넣으세요"
                      rows={5}
                      className="w-full rounded-lg border border-red-200 bg-white p-3 text-sm text-neutral-800 outline-none focus:border-red-400"
                    />
                    <button
                      type="button"
                      onClick={handleManualRetry}
                      disabled={!manualDescription.trim() || retrying}
                      className="mt-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                    >
                      {retrying ? "다시 분석 중..." : "붙여넣은 내용으로 다시 분석"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowManualPaste(true)}
                    className="mt-2 underline hover:text-red-900"
                  >
                    설명란 붙여넣기
                  </button>
                )}
              </div>
            ) : (
              !recipe.hasIngredients && (
                <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  설명란에서 재료 목록을 자동으로 찾지 못했어요. 아래에서 직접
                  추가해주세요.
                  {recipe.hasTranscript && " 자막은 찾았으니 참고해서 입력해보세요."}
                </p>
              )
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-neutral-50 px-4 py-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-neutral-500">이 재료는</span>
                <input
                  type="number"
                  min={1}
                  value={baseServings}
                  onChange={(e) =>
                    setBaseServings(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-center"
                />
                <span className="text-neutral-500">인분 기준</span>
                {recipe.servingsGuessed && (
                  <span className="text-xs text-amber-600">(추정값, 확인해주세요)</span>
                )}
              </label>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-neutral-500">몇 인분?</span>
                <button
                  type="button"
                  onClick={() => adjustServings(-1)}
                  className="h-8 w-8 rounded-full border border-neutral-300 text-lg leading-none"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={targetServings}
                  onChange={(e) =>
                    setTargetServings(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-14 rounded-md border border-neutral-300 px-2 py-1 text-center"
                />
                <button
                  type="button"
                  onClick={() => adjustServings(1)}
                  className="h-8 w-8 rounded-full border border-neutral-300 text-lg leading-none"
                >
                  +
                </button>
                <span className="text-neutral-500">인분</span>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-neutral-200 px-6 py-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                🥕 재료
                {recipe.source === "ai" && (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-600">
                    AI 분석
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setEditMode((v) => !v)}
                className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
              >
                {editMode ? "완료" : "✏️ 수정"}
              </button>
            </div>

            {editMode ? (
              <div>
                <div className="overflow-hidden rounded-lg border border-neutral-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                        <th className="px-3 py-2 font-medium">재료명</th>
                        <th className="px-3 py-2 font-medium w-24">수량</th>
                        <th className="px-3 py-2 font-medium w-20">단위</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-neutral-400">
                            재료가 없어요. 아래 버튼으로 추가해보세요.
                          </td>
                        </tr>
                      )}
                      {ingredients.map((ing) => {
                        const scaled = scaleQuantity(ing.quantity, baseServings, targetServings);
                        const displayValue =
                          scaled == null ? "" : Math.round(scaled * 100) / 100;
                        return (
                          <tr key={ing.id} className="border-b border-neutral-100 last:border-0">
                            <td className="px-3 py-1.5">
                              <input
                                value={ing.name}
                                onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                                placeholder="재료명"
                                className="w-full rounded-md border border-transparent px-2 py-1 hover:border-neutral-200 focus:border-neutral-400 outline-none"
                              />
                              {ing.note && (
                                <span className="ml-1 text-xs text-neutral-400">
                                  ({ing.note})
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                step="any"
                                value={displayValue}
                                onChange={(e) =>
                                  updateIngredient(ing.id, "displayQuantity", e.target.value)
                                }
                                placeholder={ing.unit && !ing.quantity ? "" : "-"}
                                className="w-full rounded-md border border-transparent px-2 py-1 text-right hover:border-neutral-200 focus:border-neutral-400 outline-none"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                value={ing.unit}
                                onChange={(e) => updateIngredient(ing.id, "unit", e.target.value)}
                                placeholder="단위"
                                className="w-full rounded-md border border-transparent px-2 py-1 hover:border-neutral-200 focus:border-neutral-400 outline-none"
                              />
                            </td>
                            <td className="px-1">
                              <button
                                type="button"
                                onClick={() => removeIngredient(ing.id)}
                                className="text-neutral-300 hover:text-red-500"
                                aria-label="삭제"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="mt-2 text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                >
                  + 재료 추가
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {ingredientGroups.map((group) => (
                  <div key={group.label || "__default__"}>
                    {group.label && (
                      <p className="mb-1.5 text-sm font-semibold text-neutral-500">
                        {groupIcon(group.label)} {group.label}
                      </p>
                    )}
                    <div>
                      {group.items.map((ing) => (
                        <div
                          key={ing.id}
                          className="flex items-baseline justify-between gap-3 border-b border-dashed border-neutral-200 py-2 text-sm last:border-0"
                        >
                          <span>
                            {ing.name}
                            {ing.note && (
                              <span className="ml-1.5 text-xs text-neutral-400">
                                ({ing.note})
                              </span>
                            )}
                          </span>
                          <span className="flex-shrink-0 font-medium tabular-nums">
                            {displayAmount(ing, baseServings, targetServings)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {ingredients.length === 0 && (
                  <p className="text-sm text-neutral-400">
                    재료가 없어요. 위 &quot;✏️ 수정&quot;을 눌러 추가해보세요.
                  </p>
                )}
              </div>
            )}
          </div>

          {recipe.steps.length > 0 && (
            <div className="border-t border-dashed border-neutral-200 px-6 py-5">
              <h3 className="mb-3 font-semibold">👩‍🍳 만드는 법</h3>
              <div className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipe.tips.length > 0 && (
            <div className="border-t border-dashed border-neutral-200 px-6 py-5">
              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                <p className="mb-1.5 font-semibold">💡 영상에서 알려준 TIP</p>
                <ul className="space-y-1">
                  {recipe.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-neutral-200 px-6 py-4 text-xs text-neutral-400">
            <p>
              재료는 영상 설명란/자막을{" "}
              {recipe.source === "ai" ? "AI가 분석한" : "규칙 기반으로 자동 분석한"}{" "}
              결과예요. 잘못 추출된 부분은 &quot;✏️ 수정&quot;에서 직접 고칠 수 있어요.
            </p>
            {recipe.rawDescription && (
              <button
                type="button"
                onClick={() => setShowRawDescription((v) => !v)}
                className="mt-1 underline hover:text-neutral-600"
              >
                {showRawDescription ? "원본 설명란 숨기기" : "원본 설명란 보기"}
              </button>
            )}
            {showRawDescription && (
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-white p-3 text-neutral-600">
                {recipe.rawDescription}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
