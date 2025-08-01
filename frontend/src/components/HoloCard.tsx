import React, { useRef, useEffect, useState } from "react";
import { AutoResizeText } from "./AutoResizeText";
import { cn } from "@/lib/utils";

interface HoloCardProps {
  text: string;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  backgroundClass?: string;
  fillContainer?: boolean; // New prop to control if card should fill container
  showMenu?: boolean; // New prop to control if menu button is shown
  showRemoveButton?: boolean; // New prop to control if X button is shown
  fixedSize?: boolean; // New prop to force fixed sizing
  onDropToTopic?: (cardText: string) => void; // New prop for topic drop
  onDropToAudience?: (cardText: string) => void; // New prop for audience drop
  onRemove?: (cardText: string) => void; // New prop for removing card
  onDelete?: (cardText: string) => void; // New prop for deleting card
  onMenuOpen?: () => void; // New prop for menu open callback
  onMenuClose?: () => void; // New prop for menu close callback
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void; // New prop for mouse down event
  disableRemove?: boolean; // New prop to disable remove button
}

export const HoloCard = ({
  text,
  className,
  draggable = false,
  onDragStart,
  backgroundClass = "bg-slate-950",
  fillContainer = false, // Default to false for backward compatibility
  showMenu = false, // Default to false for backward compatibility
  showRemoveButton = false,
  fixedSize = false, // Default to false for backward compatibility
  onDropToTopic,
  onDropToAudience,
  onRemove,
  onDelete,
  onMenuOpen,
  onMenuClose,
  onMouseDown,
  disableRemove = false,
}: HoloCardProps) => {
  const isPointerInside = useRef(false);
  const refElement = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        refElement.current &&
        !refElement.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
        onMenuClose?.(); // Call menu close callback
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen, onMenuClose]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);
    
    // Call the appropriate callback
    if (newMenuState) {
      onMenuOpen?.();
    } else {
      onMenuClose?.();
    }
  };

  const handleDropToTopic = () => {
    setIsMenuOpen(false); // Close menu before dropping
    onMenuClose?.(); // Call menu close callback
    onDropToTopic?.(text);
  };

  const handleDropToAudience = () => {
    setIsMenuOpen(false); // Close menu before dropping
    onMenuClose?.(); // Call menu close callback
    onDropToAudience?.(text);
  };

  const handleRemove = () => {
    onRemove?.(text);
  };

  const handleDelete = () => {
    setIsMenuOpen(false); // Close menu before deleting
    onMenuClose?.(); // Call menu close callback
    onDelete?.(text);
  };

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
    "--radius": "8px", // less rounded corners
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
        "relative isolate [contain:layout_style] [perspective:600px] transition-transform duration-[var(--duration)] ease-[var(--easing)] will-change-transform",
        fillContainer ? "w-full h-full" : "inline-block",
        className
      )}
      ref={refElement}
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
        rotate.y = (delta.y / 2) * rotateFactor;
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
      onMouseDown={onMouseDown}
    >
      {/* 3-dot menu button */}
      {showMenu && (
        <div className="absolute top-1 sm:top-2 right-1 sm:right-2 z-[99999]">
          <button
            onClick={handleMenuClick}
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all duration-300 backdrop-blur-sm"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`transition-transform duration-300 ${
                isMenuOpen ? "rotate-90" : "rotate-0"
              }`}
            >
              <circle cx="6" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="18" cy="12" r="2" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {isMenuOpen && (
            <div className="absolute top-8 right-0 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg min-w-[90px] sm:min-w-[110px] md:min-w-[130px] z-[99999] animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="py-1">
                <button
                  onClick={handleDropToTopic}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left text-white hover:bg-white/10 transition-colors duration-200 text-xs sm:text-xs"
                >
                  Drop to Topic
                </button>
                <button
                  onClick={handleDropToAudience}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left text-white hover:bg-white/10 transition-colors duration-200 text-xs sm:text-xs"
                >
                  Drop to Audience
                </button>
                {showRemoveButton && (
                  <>
                    <div className="border-t border-white/20 my-1"></div>
                    <button
                      onClick={handleRemove}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left text-white hover:bg-white/10 transition-colors duration-200 text-xs sm:text-xs"
                    >
                      Remove
                    </button>
                  </>
                )}
                <div className="border-t border-white/20 my-1"></div>
                <button
                  onClick={handleDelete}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left text-red-400 hover:bg-red-500/20 transition-colors duration-200 text-xs sm:text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showRemoveButton && (
        <button
          onClick={disableRemove ? undefined : handleRemove}
          className={`absolute top-1 sm:top-2 right-1 sm:right-2 z-[99999] w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full transition-all duration-300 backdrop-blur-sm flex items-center justify-center ${
            disableRemove 
              ? "bg-gray-600/50 text-gray-400 cursor-not-allowed" 
              : "bg-black/50 hover:bg-black/70 text-white"
          }`}
          disabled={disableRemove}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      )}

      <div
        className={cn(
          "grid will-change-transform origin-center transition-transform duration-[var(--duration)] ease-[var(--easing)] [transform:rotateY(var(--r-x))_rotateX(var(--r-y))] rounded-lg border border-slate-800 overflow-hidden",
          fillContainer ? "w-full h-full" : ""
        )}
      >
        {/* Background */}
        <div
          className={cn(
            "grid [grid-area:1/1] mix-blend-soft-light [clip-path:inset(0_0_0_0_round_var(--radius))]",
            fillContainer ? "w-full h-full" : ""
          )}
        >
          <div
            className={cn(
              "px-3 sm:px-4 md:px-5 py-2 sm:py-3 md:py-4 flex items-center justify-center text-white",
              fillContainer ? "w-full h-full" : "min-w-fit",
              backgroundClass
            )}
          >
            <div
              className="text-center leading-snug break-words whitespace-normal"
              style={{
                fontSize: fixedSize
                  ? "14px"
                  : fillContainer
                  ? "clamp(12px, 2.2vw, 18px)"
                  : "clamp(10px, 2vw, 16px)",
                lineHeight: "1.3",
                wordBreak: "break-word",
                maxWidth: fixedSize
                  ? "100%"
                  : fillContainer
                  ? "calc(100% - 16px)"
                  : "clamp(80px, 15vw, 200px)",
                minWidth: fixedSize
                  ? "auto"
                  : fillContainer
                  ? "auto"
                  : "clamp(60px, 10vw, 120px)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: fillContainer ? 3 : "unset",
                WebkitBoxOrient: "vertical",
                padding: fillContainer ? "0px" : "0",
                boxSizing: "border-box",
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
