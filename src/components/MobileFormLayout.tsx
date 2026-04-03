import React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileFormLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileFormLayout = ({ children, className }: MobileFormLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "space-y-4",
        isMobile ? "space-y-6" : "space-y-4",
        className
      )}
    >
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={cn(
            isMobile 
              ? "w-full" 
              : "w-auto"
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
};