import React, { useRef, useEffect } from "react";
import { AutoResizeText } from './AutoResizeText';
import { cn } from "@/lib/utils";

interface HoloCardProps {
  text: string;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  backgroundClass?: string;
}

export const HoloCard = ({
  text,
  className,
  draggable = false,
  onDragStart,
  backgroundClass = "bg-slate-950",
}: HoloCardProps) => {
  const isPointerInside = useRef(false);
  const refElement = useRef<HTMLDivElement>(null);
  const state = useRef({
    glare: { x: 50, y: 50 },
    background: { x: 50, y: 50 },
    rotate: { x: 0, y: 0 },
  });

  const updateStyles = () => {
    if (refElement.current) {
      const { background, rotate, glare } = state.current;
      refElement.current.style.setProperty("--m-x", `${glare.x}%`);
      refElement.current.style.setProperty("--m-y", `${glare.y}%`);
      refElement.current.style.setProperty("--r-x", `${rotate.x}deg`);
      refElement.current.style.setProperty("--r-y", `${rotate.y}deg`);
      refElement.current.style.setProperty("--bg-x", `${background.x}%`);
      refElement.current.style.setProperty("--bg-y", `${background.y}%`);
    }
  };

  useEffect(() => {
    updateStyles(); // initialize glare and background positions
  }, []);

  const containerStyle = {
    "--m-x": "50%",
    "--m-y": "50%",
    "--r-x": "0deg",
    "--r-y": "0deg",
    "--bg-x": "50%",
    "--bg-y": "50%",
    "--duration": "300ms",
    "--foil-size": "100%",
    "--opacity": "0.5", // make glare visible by default
    "--radius": "16px", // less rounded corners
    "--easing": "ease",
    "--transition": "var(--duration) var(--easing)",
  } as React.CSSProperties;

  const backgroundStyle = {
    "--step": "5%",
    "--foil-svg": `url("data:image/svg+xml,%3Csvg width='26' height='26' ... %3E")`,
    "--pattern": "var(--foil-svg) center/100% no-repeat",
    "--rainbow":
      "repeating-linear-gradient(0deg, #ff7773 calc(var(--step)*1), #ffed5f calc(var(--step)*2), #a8ff5f calc(var(--step)*3), #83fff7 calc(var(--step)*4), #7894ff calc(var(--step)*5), #d875ff calc(var(--step)*6), #ff7773 calc(var(--step)*7)) 0% var(--bg-y)/200% 700% no-repeat",
    "--diagonal":
      "repeating-linear-gradient(128deg, #0e152e 0%, hsl(180,10%,60%) 3.8%, hsl(180,10%,60%) 4.5%, hsl(180,10%,60%) 5.2%, #0e152e 10%, #0e152e 12%) var(--bg-x) var(--bg-y)/300% no-repeat",
    "--shade":
      "radial-gradient(farthest-corner circle at var(--m-x) var(--m-y), rgba(255,255,255,0.1) 12%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.25) 120%) var(--bg-x) var(--bg-y)/300% no-repeat",
    backgroundBlendMode: "hue, hue, hue, overlay",
  } as React.CSSProperties;

  return (
    <div
      style={containerStyle}
      className={cn(
        "relative isolate [contain:layout_style] [perspective:600px] transition-transform duration-[var(--duration)] ease-[var(--easing)] will-change-transform w-auto inline-block",
        className
      )}
      ref={refElement}
      draggable={draggable}
      onDragStart={onDragStart}
      onPointerMove={(event) => {
        const rotateFactor = 0.4;
        const rect = event.currentTarget.getBoundingClientRect();
        const position = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        const percentage = {
          x: (100 / rect.width) * position.x,
          y: (100 / rect.height) * position.y,
        };
        const delta = {
          x: percentage.x - 50,
          y: percentage.y - 50,
        };

        const { background, rotate, glare } = state.current;
        background.x = 50 + percentage.x / 4 - 12.5;
        background.y = 50 + percentage.y / 3 - 16.67;
        rotate.x = -(delta.x / 3.5) * rotateFactor;
        rotate.y = delta.y / 2 * rotateFactor;
        glare.x = percentage.x;
        glare.y = percentage.y;

        updateStyles();
      }}
      onPointerEnter={() => {
        isPointerInside.current = true;
        setTimeout(() => {
          if (isPointerInside.current && refElement.current) {
            refElement.current.style.setProperty("--duration", "0s");
          }
        }, 300);
      }}
      onPointerLeave={() => {
        isPointerInside.current = false;
        if (refElement.current) {
          refElement.current.style.removeProperty("--duration");
          refElement.current.style.setProperty("--r-x", "0deg");
          refElement.current.style.setProperty("--r-y", "0deg");
        }
      }}
    >
      <div className="h-full w-full grid will-change-transform origin-center transition-transform duration-[var(--duration)] ease-[var(--easing)] [transform:rotateY(var(--r-x))_rotateX(var(--r-y))] rounded-[var(--radius)] border border-slate-800 overflow-hidden">
        {/* Background */}
        <div className="w-full h-full grid [grid-area:1/1] mix-blend-soft-light [clip-path:inset(0_0_0_0_round_var(--radius))]">
        <div
          className={cn(
            "px-4 py-3 h-full w-full flex items-center justify-center text-white",
            backgroundClass
          )}
        >
          <div
            className="w-full text-center leading-snug break-words"
            style={{
              fontSize: 'clamp(10px, 2vw, 16px)',
              lineHeight: '1.2',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </div>
        </div>
        
        </div>
        {/* Glare */}
        <div className="w-full h-full grid [grid-area:1/1] mix-blend-soft-light [clip-path:inset(0_0_1px_0_round_var(--radius))] opacity-[var(--opacity)] transition-opacity duration-[var(--duration)] ease-[var(--easing)] [background:radial-gradient(farthest-corner_circle_at_var(--m-x)_var(--m-y),rgba(255,255,255,0.8)_10%,rgba(255,255,255,0.65)_20%,rgba(255,255,255,0)_90%)]" />
        {/* Foil */}
        <div
          className="w-full h-full grid [grid-area:1/1] mix-blend-color-dodge opacity-[var(--opacity)] [clip-path:inset(0_0_1px_0_round_var(--radius))] [background:var(--pattern),_var(--rainbow),_var(--diagonal),_var(--shade)] after:content-[''] after:[background-size:var(--foil-size),_200%_400%,_800%,_200%] after:[background-position:center,_0%_var(--bg-y),_calc(var(--bg-x)*_-1)_calc(var(--bg-y)*_-1),_var(--bg-x)_var(--bg-y)] after:[background-blend-mode:soft-light,_hue,_hard-light]"
          style={backgroundStyle}
        />
      </div>
    </div>
  );
};
