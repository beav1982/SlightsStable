import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GameCardProps {
  text: string;
  type: "slight" | "curse";
  isSelected?: boolean;
  isSubmitted?: boolean;
  isJudgeView?: boolean;
  onClick?: () => void;
  className?: string;
}

export function GameCard({ 
  text, 
  type, 
  isSelected = false, 
  isSubmitted = false,
  isJudgeView = false,
  onClick, 
  className 
}: GameCardProps) {
  const isSlightCard = type === "slight";
  
  // Dynamic font sizing based on text length
  const getTextSize = (textLength: number) => {
    if (textLength < 50) return "text-base sm:text-lg";
    if (textLength < 80) return "text-sm sm:text-base";
    if (textLength < 120) return "text-xs sm:text-sm";
    return "text-xs";
  };
  
  // Dynamic line height based on text length
  const getLineHeight = (textLength: number) => {
    if (textLength < 50) return "leading-relaxed sm:leading-relaxed";
    if (textLength < 120) return "leading-snug sm:leading-normal";
    return "leading-tight";
  };
  
  return (
    <Card
      className={cn(
        "bg-white text-slate-800 shadow-lg transition-all duration-300 cursor-pointer min-h-[140px] sm:min-h-[160px] flex flex-col",
        isSelected && "border-4 border-indigo-500 ring-4 ring-indigo-500/30 shadow-xl transform scale-105",
        isSubmitted && "opacity-75",
        isJudgeView && "hover:shadow-xl hover:-translate-y-2",
        !isJudgeView && onClick && "hover:shadow-lg hover:-translate-y-1 hover:border-indigo-300",
        onClick && "transform",
        isSlightCard && "border-4 border-pink-500",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 md:p-6 flex-1 flex flex-col justify-between">
        <div className="text-center flex-1 flex flex-col justify-center">
          <div className={cn(
            "font-semibold text-slate-800 break-words hyphens-auto",
            getTextSize(text.length),
            getLineHeight(text.length)
          )}>
            {text}
          </div>
        </div>
        {isSlightCard && (
          <div className="mt-3 flex justify-center flex-shrink-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-pink-500 rounded-full flex items-center justify-center">
              <i className="fas fa-exclamation text-white text-xs sm:text-sm"></i>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
