'use client';

import { useRef, useState, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import './HoloCard.css';

interface HoloCardProps {
  text: string;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const SPARKLE_COUNT = 18;

export function HoloCard({ text, className, ...props }: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shinePos, setShinePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const sparkles = useMemo(() => {
    return Array.from({ length: SPARKLE_COUNT }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 2,
    }));
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setShinePos({ x, y });
    setIsHovering(true);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const offsetX = e.clientX - rect.left - centerX;
    const offsetY = e.clientY - rect.top - centerY;
    const rotateX = (-1) * (offsetY / centerY) * 12;
    const rotateY = (offsetX / centerX) * 12;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setShinePos({ x: 50, y: 50 });
    setIsHovering(false);
    setRotate({ x: 0, y: 0 });
  };

  const getSparkleOpacity = (sparkle: { left: number; top: number }) => {
    if (!isHovering) return 0.4;
    const dx = shinePos.x - sparkle.left;
    const dy = shinePos.y - sparkle.top;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 18 ? 1 : 0.4;
  };

  return (
    <div
      ref={cardRef}
      className={twMerge(
        'relative inline-flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300',
        'min-w-[180px] min-h-[80px] px-6 py-4',
        isHovering
          ? 'border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.4)]'
          : 'border-purple-700',
        'holo-vmax',
        className
      )}
      style={{
        perspective: '900px',
        transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        transition: isHovering
          ? 'transform 0.1s cubic-bezier(.25,.8,.25,1)'
          : 'transform 0.4s cubic-bezier(.25,.8,.25,1)',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      draggable={props.draggable}
      onDragStart={props.onDragStart}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `radial-gradient(650px circle at ${shinePos.x}% ${shinePos.y}%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.0) 70%)`,
          mixBlendMode: 'screen',
          opacity: 0.7,
          transition: 'background 0.2s',
        }}
      />
      <div className="card__shine pointer-events-none absolute inset-0 z-10" />
      <div className="card__glare pointer-events-none absolute inset-0 z-10" />

      <div className="pointer-events-none absolute inset-0 z-20">
        {sparkles.map((sparkle, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              left: `${sparkle.left}%`,
              top: `${sparkle.top}%`,
              width: `${sparkle.size}px`,
              height: `${sparkle.size}px`,
              opacity: getSparkleOpacity(sparkle),
              filter: 'blur(0.5px)',
              transition: 'opacity 0.2s',
            }}
          />
        ))}
      </div>

      <div className="relative z-30 text-white text-center font-bold text-lg drop-shadow-lg">
        {text}
      </div>
    </div>
  );
}
