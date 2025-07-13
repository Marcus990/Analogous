"use client";

import { useRef, useEffect, useState } from "react";

interface AutoResizeTextProps {
  text: string;
  minFontSize?: number;
  maxFontSize?: number;
  className?: string;
}

export const AutoResizeText = ({
  text,
  minFontSize = 12,
  maxFontSize = 32,
  className = "",
}: AutoResizeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const resize = () => {
      const container = containerRef.current;
      const textEl = textRef.current;

      if (!container || !textEl) return;

      let currentSize = maxFontSize;
      textEl.style.fontSize = `${currentSize}px`;

      while (
        currentSize > minFontSize &&
        (textEl.scrollHeight > container.clientHeight ||
          textEl.scrollWidth > container.clientWidth)
      ) {
        currentSize -= 1;
        textEl.style.fontSize = `${currentSize}px`;
      }

      setFontSize(currentSize);
    };

    resize();

    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text, maxFontSize, minFontSize]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center text-white ${className}`}
    >
      <div
        ref={textRef}
        style={{ fontSize }}
        className="w-full text-center px-2 break-words leading-snug inline-block"
      >
        {text}
      </div>
    </div>
  );
};
