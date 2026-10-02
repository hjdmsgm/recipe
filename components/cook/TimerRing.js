const R = 66;
const C = 2 * Math.PI * R;

function mmss(s) {
  const sec = Math.max(0, Math.round(s));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function TimerRing({ left, total, running, onToggle }) {
  const offset = C * (1 - Math.min(1, Math.max(0, left / total)));
  return (
    <div className="flex flex-col items-center my-1.5 mb-[18px]">
      <div className="relative w-[150px] h-[150px]">
        <svg viewBox="0 0 150 150" className="w-[150px] h-[150px] -rotate-90">
          <circle cx="75" cy="75" r={R} fill="none" strokeWidth="7" className="stroke-dark-line" />
          <circle
            cx="75"
            cy="75"
            r={R}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className="stroke-main transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeDasharray={C}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-[32px] font-bold tabular-nums">{mmss(left)}</span>
          <button
            type="button"
            onClick={onToggle}
            aria-label={running ? "일시정지" : "타이머 시작"}
            className="w-[34px] h-[34px] rounded-full grid place-items-center text-main"
          >
            <svg className="w-5 h-5">
              <use href={`#i-${running ? "pause" : "play"}`} />
            </svg>
          </button>
        </div>
      </div>
      <span className="text-xs text-dark-sub mt-1.5">
        {running ? "다른 단계로 넘어가도 타이머는 계속 돌아가요" : `눌러서 ${Math.round(total / 60)}분 타이머 시작`}
      </span>
    </div>
  );
}
