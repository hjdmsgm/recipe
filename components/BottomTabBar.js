"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", icon: "i-home", heart: false },
  { href: "/search", label: "검색", icon: "i-search", heart: false },
  { href: "/saved", label: "저장", icon: "i-heart", heart: true },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="메뉴"
      className="fixed left-0 right-0 bottom-0 z-20 bg-surface border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-[480px] mx-auto grid grid-cols-3">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 pb-2 text-[11px] ${
                active ? "text-main" : "text-sub"
              }`}
            >
              <svg
                className="w-[22px] h-[22px]"
                fill={active && tab.heart ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={tab.heart ? 2 : undefined}
              >
                <use href={`#${tab.icon}`} />
              </svg>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
