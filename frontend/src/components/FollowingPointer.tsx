import React, { useEffect, useState, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionTemplate,
} from "motion/react";
import { cn } from "@/lib/utils";

export const FollowerPointerCard = ({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const [isInside, setIsInside] = useState(false);

  // Cleanup effect to reset hover state when component unmounts
  useEffect(() => {
    return () => {
      // Reset hover state when component unmounts
      setIsInside(false);
    };
  }, []);

  // Reset hover state when component updates
  useEffect(() => {
    setIsInside(false);
  }, [children]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (ref.current) {
      const bounds = ref.current.getBoundingClientRect();
      x.set(e.clientX - bounds.left + 10);
      y.set(e.clientY - bounds.top + 10);
    }
  }, [x, y]);

  const handleMouseEnter = useCallback(() => {
    setIsInside(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsInside(false);
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className={cn("relative overflow-visible", className)}
      style={{ cursor: "grab" }}
    >
      <AnimatePresence>
        {isInside && <FollowPointer x={x} y={y} title={title} />}
      </AnimatePresence>
      {children}
    </div>
  );
};

export const FollowPointer = ({
  x,
  y,
  title,
}: {
  x: any;
  y: any;
  title?: string | React.ReactNode;
}) => {
  const top = useMotionTemplate`${y}px`;
  const left = useMotionTemplate`${x}px`;

  return (
    <motion.div
      className="absolute z-[99999] pointer-events-none"
      style={{ top, left }}
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
    >
      <motion.div
        style={{ backgroundColor: "#9333ea" }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="translate-x-[10px] translate-y-[20px] rounded-full px-3 py-2 text-sm font-semibold text-white shadow-md whitespace-nowrap"
      >
        {title || `Drag & Drop!`}
      </motion.div>
    </motion.div>
  );
};
