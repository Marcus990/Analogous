import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "framer-motion";

export const BackgroundGradient = ({
  children,
  className,
  containerClassName,
  animate = false,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}) => {
  return (
    <div
      className={cn(
        "relative rounded-lg p-[2px] bg-gradient-to-r from-purple-500 to-blue-500",
        containerClassName
      )}
    >
      <div
        className={cn(
          "rounded-lg bg-[#1a1a1a] w-full h-full flex items-center justify-center",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};
