export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      className="brand__mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <line x1="8" y1="9" x2="16" y2="16" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1="24" y1="9" x2="16" y2="16" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1="16" y1="16" x2="16" y2="25" stroke="#d4ff4f" strokeWidth="1.5" />
      <circle cx="8" cy="9" r="3.2" fill="#57c7ff" />
      <circle cx="24" cy="9" r="3.2" fill="#a972ff" />
      <circle cx="16" cy="16" r="4" fill="#d4ff4f" />
      <circle cx="16" cy="25" r="3" fill="#2dd4a7" />
    </svg>
  );
}
