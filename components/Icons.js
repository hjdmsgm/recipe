// Shared icon sprite, ported from the cooklab design prototype. Mounted once
// in the root layout; every icon elsewhere is just <svg><use href="#i-x"/></svg>.
export default function Icons() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="i-heart" viewBox="0 0 24 24">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
      </symbol>
      <symbol id="i-hat" viewBox="0 0 24 24">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          d="M7 14.5V19h10v-4.5M7 14.5A4 4 0 0 1 6.5 6.6a5 5 0 0 1 9.6-1.2A4 4 0 1 1 17 14.5z"
        />
      </symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 12h14M13 6l6 6-6 6"
        />
      </symbol>
      <symbol id="i-left" viewBox="0 0 24 24">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 18l-6-6 6-6"
        />
      </symbol>
      <symbol id="i-x" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      </symbol>
      <symbol id="i-clock" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </g>
      </symbol>
      <symbol id="i-users" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.6 3 5.2" />
        </g>
      </symbol>
      <symbol id="i-yt" viewBox="0 0 24 24">
        <rect x="1.5" y="5" width="21" height="14" rx="4" fill="#ff0000" />
        <path d="M10 9v6l5-3z" fill="#fff" />
      </symbol>
      <symbol id="i-home" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M3.5 10.5L12 4l8.5 6.5V20h-5.5v-5.5h-6V20H3.5z" />
      </symbol>
      <symbol id="i-search" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </g>
      </symbol>
      <symbol id="i-play" viewBox="0 0 24 24">
        <path fill="currentColor" d="M8 5v14l11-7z" />
      </symbol>
      <symbol id="i-pause" viewBox="0 0 24 24">
        <path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
      </symbol>
      <symbol id="i-check" viewBox="0 0 24 24">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 12.5l4.5 4.5L19 7.5"
        />
      </symbol>
    </svg>
  );
}
