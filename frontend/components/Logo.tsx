import React from "react";

interface LogoProps {
  className?: string;
  size?: number | string;
}

export function Logo({ className = "", size = "100%" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left Vertical Stem */}
      <path d="M 10 15 L 18 15 L 18 85 L 10 85 Z" />
      {/* Inner Chevron */}
      <path d="M 28 50 L 63 15 L 73 15 L 38 50 L 73 85 L 63 85 Z" />
      {/* Outer Chevron */}
      <path d="M 48 50 L 83 15 L 93 15 L 58 50 L 93 85 L 83 85 Z" />
    </svg>
  );
}
