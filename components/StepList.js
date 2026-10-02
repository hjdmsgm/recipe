export default function StepList({ steps }) {
  if (steps.length === 0) {
    return <p className="text-sm text-sub py-6 text-center">조리 순서를 찾지 못했어요.</p>;
  }
  return (
    <ol className="list-none m-0 mt-2 p-0">
      {steps.map((step, i) => (
        <li key={i} className="grid grid-cols-[40px_1fr] gap-2 py-3.5 border-b border-line last:border-0">
          <span className="font-black text-main text-[15px]">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <p className="m-0 text-sm">{step.text}</p>
            {step.timerSeconds && (
              <span className="inline-flex gap-1 items-center mt-1.5 text-xs text-main-deep bg-main-soft rounded-full px-2.5 py-0.5">
                ⏱ 타이머 {Math.round(step.timerSeconds / 60)}분
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
