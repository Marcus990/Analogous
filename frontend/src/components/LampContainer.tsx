"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const LampContainer = ({
  children,
  className,
  onFinish,
}: {
  children: React.ReactNode;
  className?: string;
  onFinish?: () => void;
}) => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1100); // match animation duration (300ms delay + 800ms anim)

    return () => clearTimeout(timeout);
  }, [onFinish]);

  const [hasFired, setHasFired] = useState(false);

  return (
    <div className={cn("relative w-full overflow-hidden bg-black", className)}>
      {/* Lamp is only shown on md and above */}
      <div className="hidden md:block absolute top-10 left-0 w-full h-[40vh] z-0">
        <div className="relative flex w-full h-full items-center justify-center scale-y-125 isolate">
          <motion.div
            initial={{ opacity: 0.5, width: "15rem" }}
            animate={{ opacity: 1, width: "30rem" }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            style={{
              backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
            }}
            className="absolute right-1/2 h-56 w-[30rem] bg-gradient-conic from-purple-500 via-transparent to-transparent [--conic-position:from_70deg_at_center_top]"
          >
            <div className="absolute w-full left-0 h-40 bottom-0 z-20 bg-black [mask-image:linear-gradient(to_top,white,transparent)]" />
            <div className="absolute w-40 h-full left-0 bottom-0 z-20 bg-black [mask-image:linear-gradient(to_right,white,transparent)]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0.5, width: "15rem" }}
            animate={{ opacity: 1, width: "30rem" }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            style={{
              backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
            }}
            className="absolute left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-purple-500 [--conic-position:from_290deg_at_center_top]"
          >
            <div className="absolute w-40 h-full right-0 bottom-0 z-20 bg-black [mask-image:linear-gradient(to_left,white,transparent)]" />
            <div className="absolute w-full right-0 h-40 bottom-0 z-20 bg-black [mask-image:linear-gradient(to_top,white,transparent)]" />
          </motion.div>

          <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-black blur-2xl"></div>
          <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md"></div>
          <div className="absolute z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-purple-500 opacity-50 blur-3xl"></div>
          <motion.div
            initial={{ width: "8rem" }}
            animate={{ width: "16rem" }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            className="absolute z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-purple-400 blur-2xl"
          ></motion.div>
          <motion.div
            initial={{ width: "15rem" }}
            animate={{ width: "30rem" }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            className="absolute z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-purple-400"
            onAnimationComplete={() => {
              if (!hasFired) {
                setHasFired(true);
                onFinish?.();
              }
            }}
          />
        </div>
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
};
