"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface MaskedRevealValueProps {
  value: string;
  maskedValue?: string;
  className?: string;
}

export function MaskedRevealValue({
  value,
  maskedValue = "** *** **",
  className,
}: MaskedRevealValueProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        "text-left transition-all",
        !isRevealed && "tracking-wider",
        className,
      )}
      onMouseEnter={() => setIsRevealed(true)}
      onMouseLeave={() => setIsRevealed(false)}
      onFocus={() => setIsRevealed(true)}
      onBlur={() => setIsRevealed(false)}
      onClick={() => setIsRevealed((current) => !current)}
      aria-label={isRevealed ? value : "Hidden value. Hover, focus, or tap to reveal."}
    >
      {isRevealed ? value : maskedValue}
    </button>
  );
}
