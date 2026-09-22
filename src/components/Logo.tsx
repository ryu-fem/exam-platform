"use client";

export function Logo({
  showText = true,
  size = 32,
  text = "منصة الاختبارات",
  className = "",
  textClassName = "text-base font-bold tracking-tight",
}: {
  showText?: boolean;
  size?: number;
  text?: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Graduation cap outline */}
        <path
          d="M16 4 L28 12 L16 20 L4 12 Z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
        {/* Checkmark inside the cap */}
        <path
          d="M9.5 12.5 L14 16.8 L22.5 8"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Tassel string */}
        <path
          d="M16 20 L16 22.5"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Tassel button */}
        <circle cx="16" cy="24" r={1} fill="currentColor" />
      </svg>
      {showText && <span className={textClassName}>{text}</span>}
    </div>
  );
}