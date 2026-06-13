"use client";

import { useId } from "react";

export function LogoMark({ size = 28 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      className="brand__mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-node`} x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#18181c" />
          <stop offset="1" stopColor="#101012" />
        </linearGradient>
      </defs>

      <path
        d="M16 9.5 V12.5 M12.5 16.5 L9.5 19.5 M19.5 16.5 L22.5 19.5"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1.35"
        strokeLinecap="round"
      />

      <g>
        <rect x="12.5" y="4.5" width="7" height="5" rx="1.4" fill={`url(#${uid}-node)`} stroke="rgba(255,255,255,0.16)" strokeWidth="0.9" />
        <rect x="12.5" y="4.5" width="7" height="1.1" rx="1.4" fill="rgba(255,255,255,0.28)" />
      </g>

      <g>
        <rect x="7.5" y="12.5" width="17" height="6.5" rx="1.6" fill={`url(#${uid}-node)`} stroke="rgba(255,255,255,0.22)" strokeWidth="0.9" />
        <rect x="7.5" y="12.5" width="17" height="1.3" rx="1.4" fill="#d4ff4f" />
      </g>

      <g>
        <rect x="5.5" y="20.5" width="8" height="4.5" rx="1.3" fill={`url(#${uid}-node)`} stroke="rgba(255,255,255,0.14)" strokeWidth="0.9" />
        <rect x="5.5" y="20.5" width="8" height="1" rx="1.3" fill="rgba(255,255,255,0.22)" />
      </g>

      <g>
        <rect x="18.5" y="20.5" width="8" height="4.5" rx="1.3" fill={`url(#${uid}-node)`} stroke="rgba(255,255,255,0.14)" strokeWidth="0.9" />
        <rect x="18.5" y="20.5" width="8" height="1" rx="1.3" fill="rgba(255,255,255,0.22)" />
      </g>
    </svg>
  );
}

export function BrandWordmark() {
  return (
    <span className="brand__word">
      Code<span className="brand__accent">Graph</span>
    </span>
  );
}
