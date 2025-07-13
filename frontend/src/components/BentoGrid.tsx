import { cn } from "@/lib/utils";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { motion } from "framer-motion";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2 md:auto-rows-fr",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridResultsPage = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2 md:auto-rows-fr",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridDashboard = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-5 md:grid-rows-2 md:auto-rows-fr",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  onClick,
  skeleton,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  skeleton?: React.ReactNode;
}) => {
  return (
    <BackgroundGradient
      containerClassName={cn("w-full h-full rounded-lg flex", className)}
      className="items-start justify-start"
    >
      <div 
        className="w-full cursor-pointer relative overflow-hidden"
        onClick={onClick}
      >
        {/* Skeleton Animation */}
        {skeleton && (
          <div className="absolute inset-0 pointer-events-none">
            {skeleton}
          </div>
        )}
        
        <div className="group/bento shadow-input flex flex-col h-full transition duration-200 hover:shadow-xl space-y-8 dark:shadow-none text-left w-full relative z-10 p-8">
          {header}
          <div className="transition duration-200 group-hover/bento:translate-x-1 w-full flex-1 flex flex-col justify-start">
            <div className="my-2">{icon}</div>
            <div className="font-sans font-bold text-white text-lg mb-1">
              {title}
            </div>
            <div className="font-sans text-sm font-normal text-white">
              {description}
            </div>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export const BentoGridItemResultsPage = ({
  className,
  title,
  description,
  header,
  icon,
  onClick,
  skeleton,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  skeleton?: React.ReactNode;
}) => {
  return (
    <BackgroundGradient
      containerClassName={cn("w-full h-full rounded-lg flex", className)}
      className="items-center justify-center"
    >
      <div 
        className="w-full cursor-pointer relative overflow-hidden"
        onClick={onClick}
      >
        {/* Skeleton Animation */}
        {skeleton && (
          <div className="absolute inset-0 pointer-events-none">
            {skeleton}
          </div>
        )}
        
        <div className="group/bento shadow-input flex flex-col h-full transition duration-200 hover:shadow-xl space-y-8 dark:shadow-none text-left w-full relative z-10 p-8">
          {header}
          <div className="transition duration-200 group-hover/bento:translate-x-1 w-full flex-1 flex flex-col justify-center">
            <div className="my-2">{icon}</div>
            <div className="font-sans font-bold text-white text-lg mb-1">
              {title}
            </div>
            <div className="font-sans text-sm font-normal text-white">
              {description}
            </div>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};
