export default function ServingsStepper({ servings, onChange, min = 1, max = 12 }) {
  return (
    <div className="flex justify-between items-center bg-surface -mx-5 px-5 pt-3.5 pb-[18px]">
      <div>
        <b className="block text-[15px]">몇 인분 만들까요?</b>
        <small className="text-sub text-xs">재료 양이 자동으로 바뀌어요</small>
      </div>
      <div className="flex items-center border-[1.5px] border-line rounded-full p-[3px]">
        <button
          type="button"
          aria-label="인분 줄이기"
          onClick={() => onChange(Math.max(min, servings - 1))}
          className="w-9 h-9 rounded-full grid place-items-center text-xl active:bg-main-soft"
        >
          −
        </button>
        <output className="min-w-[60px] text-center font-bold">{servings}인분</output>
        <button
          type="button"
          aria-label="인분 늘리기"
          onClick={() => onChange(Math.min(max, servings + 1))}
          className="w-9 h-9 rounded-full grid place-items-center text-xl active:bg-main-soft"
        >
          +
        </button>
      </div>
    </div>
  );
}
