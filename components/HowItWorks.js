// "이렇게 요리해요" — 3-step explainer shown on the home screen. The
// illustrations are inline SVG built from the brand tokens (so they follow
// light/dark mode) rather than image files.

function Blob() {
  return <ellipse cx="48" cy="34" rx="40" ry="27" className="fill-main-soft" />;
}

function PasteLinkArt() {
  return (
    <svg viewBox="0 0 96 64" className="w-full h-16" aria-hidden="true">
      <Blob />
      <rect x="14" y="16" width="30" height="30" rx="8" className="fill-surface stroke-line" strokeWidth="1.5" />
      <g fill="none" className="stroke-main" strokeWidth="2.6" strokeLinecap="round">
        <rect x="19.5" y="27" width="13" height="7.5" rx="3.75" transform="rotate(-38 26 30.75)" />
        <rect x="26" y="29" width="13" height="7.5" rx="3.75" transform="rotate(-38 32.5 32.75)" />
      </g>
      <rect x="50" y="16" width="30" height="30" rx="8" className="fill-surface stroke-line" strokeWidth="1.5" />
      <rect x="54" y="25" width="22" height="14" rx="4.5" fill="#FF0000" />
      <path d="M62.5 28.5v7l6-3.5z" fill="#fff" />
      <path
        d="M68 36l1.6 11 3-3.6 4.2 2.6-4.8-5.8z"
        className="fill-ink stroke-surface"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <g className="stroke-main" strokeWidth="1.8" strokeLinecap="round">
        <path d="M80 33l3.5-1.5M79 40l3 2.5M74 31l1-3.5" />
      </g>
    </svg>
  );
}

function PickServingsArt() {
  return (
    <svg viewBox="0 0 96 64" className="w-full h-16" aria-hidden="true">
      <Blob />
      <rect x="20" y="8" width="42" height="48" rx="7" className="fill-surface stroke-line" strokeWidth="1.5" />
      <g strokeLinecap="round" strokeWidth="2.4">
        <circle cx="29" cy="20" r="2.4" className="fill-main" stroke="none" />
        <path d="M36 20h18" className="stroke-line" />
        <circle cx="29" cy="31" r="2.4" className="fill-main" stroke="none" />
        <path d="M36 31h14" className="stroke-line" />
        <circle cx="29" cy="42" r="2.4" className="fill-main" stroke="none" />
        <path d="M36 42h18" className="stroke-line" />
      </g>
      <circle cx="62" cy="40" r="10" className="fill-surface stroke-main" strokeWidth="3.2" />
      <path d="M69.5 47.5l8 8" className="stroke-main" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function CookStepsArt() {
  return (
    <svg viewBox="0 0 96 64" className="w-full h-16" aria-hidden="true">
      <Blob />
      <g fill="none" className="stroke-main" strokeWidth="2.2" strokeLinecap="round" opacity=".55">
        <path d="M38 20c-4-4 3-6-1-11" />
        <path d="M49 20c-4-4 3-6-1-11" />
        <path d="M60 20c-4-4 3-6-1-11" />
      </g>
      <rect x="17" y="36" width="9" height="4.5" rx="2.25" className="fill-main-deep" />
      <rect x="70" y="36" width="9" height="4.5" rx="2.25" className="fill-main-deep" />
      <path d="M25 33h46v12a10 10 0 0 1-10 10H35a10 10 0 0 1-10-10z" className="fill-main" />
      <rect x="22" y="28" width="52" height="7" rx="3.5" className="fill-main-deep" />
      <rect x="44" y="23" width="8" height="6" rx="3" className="fill-main-deep" />
      <g className="stroke-main" strokeWidth="1.8" strokeLinecap="round">
        <path d="M80 24l3.5-2M82 31h4" />
      </g>
    </svg>
  );
}

const STEPS = [
  { n: 1, Art: PasteLinkArt, title: "링크 붙여넣기", desc: "유튜브 레시피 링크를 붙여넣어 주세요." },
  { n: 2, Art: PickServingsArt, title: "인분 정하기", desc: "원하는 인분 수를 선택해 주세요." },
  { n: 3, Art: CookStepsArt, title: "단계별 따라 하기", desc: "재료부터 조리 순서까지 알려드려요." },
];

export default function HowItWorks() {
  return (
    <ol className="list-none m-0 p-0 flex items-stretch gap-1">
      {STEPS.map(({ n, Art, title, desc }, i) => (
        <li key={n} className="contents">
          <div className="relative flex-1 min-w-0 bg-surface border border-line rounded-2xl px-2 pt-3 pb-3.5 text-center">
            <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-ink text-bg text-xs font-black grid place-items-center">
              {n}
            </span>
            <div className="mt-3">
              <Art />
            </div>
            <b className="block mt-1.5 text-[13px] font-bold" style={{ wordBreak: "keep-all" }}>
              {title}
            </b>
            <p className="m-0 mt-1 text-[11.5px] leading-snug text-sub" style={{ wordBreak: "keep-all" }}>
              {desc}
            </p>
          </div>
          {i < STEPS.length - 1 && (
            <svg className="flex-none self-center w-4 h-4 text-main" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          )}
        </li>
      ))}
    </ol>
  );
}
