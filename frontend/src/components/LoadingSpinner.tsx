import React from "react";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "white" | "purple" | "yellow" | "red";
  className?: string;
}

export default function LoadingSpinner({ 
  size = "md", 
  color = "white", 
  className = "" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: "h-2.5 w-2.5 sm:h-3 sm:w-3",
    sm: "h-3 w-3 sm:h-4 sm:w-4", 
    md: "h-4 w-4 sm:h-5 sm:w-5",
    lg: "h-12 w-12",
    xl: "h-32 w-32"
  };

  const colorClasses = {
    white: "border-white",
    purple: "border-purple-400",
    yellow: "border-yellow-400", 
    red: "border-red-400"
  };

  return (
    <div 
      className={`animate-spin rounded-full border-b-4 ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );
}

// Convenience components for common use cases
export function ButtonSpinner({ color = "white", className = "" }: Omit<LoadingSpinnerProps, "size">) {
  return <LoadingSpinner size="sm" color={color} className={className} />;
}

// All page-level spinners now use the same size (lg) for consistency
export function PageSpinner({ color = "purple", className = "" }: Omit<LoadingSpinnerProps, "size">) {
  return <LoadingSpinner size="lg" color={color} className={className} />;
}

export function ComponentSpinner({ color = "purple", className = "" }: Omit<LoadingSpinnerProps, "size">) {
  return <LoadingSpinner size="xl" color={color} className={className} />;
}

// Standardized loading message component with consistent typography
interface LoadingMessageProps {
  message: string;
  className?: string;
}

export function LoadingMessage({ message, className = "" }: LoadingMessageProps) {
  return (
    <p className={`mt-4 text-gray-400 text-center font-medium text-base sm:text-lg ${className}`}>
      {message}
    </p>
  );
}
