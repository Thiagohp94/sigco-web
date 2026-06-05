"use client";

interface ToothLogoProps {
  className?: string;
  size?: number;
}

export function ToothLogo({ className, size = 24 }: ToothLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tooth body */}
      <path
        d="M32 4C24 4 20 8 18 12C16 16 14 18 10 18C8 18 6 20 6 24C6 28 8 32 12 34C14 36 16 40 18 48C20 56 22 60 26 60C28 60 29 58 30 54L32 46L34 54C35 58 36 60 38 60C42 60 44 56 46 48C48 40 50 36 52 34C56 32 58 28 58 24C58 20 56 18 54 18C50 18 48 16 46 12C44 8 40 4 32 4Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Bracket wire - horizontal */}
      <path
        d="M14 26H50"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Bracket - left */}
      <rect x="18" y="22" width="6" height="8" rx="1.5" fill="currentColor" opacity="0.9" />
      {/* Bracket - center */}
      <rect x="29" y="22" width="6" height="8" rx="1.5" fill="currentColor" opacity="0.9" />
      {/* Bracket - right */}
      <rect x="40" y="22" width="6" height="8" rx="1.5" fill="currentColor" opacity="0.9" />
      {/* Bracket details - small dots */}
      <circle cx="21" cy="26" r="1.2" fill="white" />
      <circle cx="32" cy="26" r="1.2" fill="white" />
      <circle cx="43" cy="26" r="1.2" fill="white" />
    </svg>
  );
}
