export default function Logo({ className = "" }) {
  return (
    <div
      aria-label="cooklab"
      className={`flex items-end font-logo font-extrabold text-[26px] tracking-[-0.02em] leading-none ${className}`}
    >
      cook
      <b className="relative text-main font-extrabold">
        lab
        <svg className="absolute w-4 h-4 -right-1 -top-3 text-main">
          <use href="#i-hat" />
        </svg>
      </b>
    </div>
  );
}
