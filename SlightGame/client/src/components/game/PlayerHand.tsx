import { GameCard } from "./GameCard";
import { Card, CardContent } from "@/components/ui/card";
import type { CurseCard } from "@shared/schema";

interface PlayerHandProps {
  cards: CurseCard[];
  selectedCardId?: number;
  onCardSelect?: (cardId: number) => void;
  isJudging?: boolean;
  hasSubmitted?: boolean;
}

export function PlayerHand({ 
  cards, 
  selectedCardId, 
  onCardSelect, 
  isJudging = false,
  hasSubmitted = false
}: PlayerHandProps) {
  if (cards.length === 0) {
    return (
      <Card className="bg-slate-800/30 border-slate-700">
        <CardContent className="p-6">
          <div className="text-center text-slate-400">
            <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <div>Loading your cards...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <i className="fas fa-hand-holding text-indigo-500 mr-2"></i>
            Your Hand ({cards.length} cards)
          </span>
          {isJudging && (
            <span className="text-sm text-slate-400">You are judging this round</span>
          )}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          {cards.map((card) => (
            <GameCard
              key={card.id}
              text={card.text}
              type="curse"
              isSelected={selectedCardId === card.id}
              isSubmitted={hasSubmitted}
              onClick={
                !isJudging && !hasSubmitted && onCardSelect 
                  ? () => onCardSelect(card.id) 
                  : undefined
              }
              className={cn(
                isJudging && "opacity-50",
                !isJudging && !hasSubmitted && onCardSelect && "hover:border-slate-300"
              )}
            />
          ))}
        </div>
        
        {isJudging && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <i className="fas fa-info-circle text-yellow-400 mr-2"></i>
              <span className="text-yellow-300 text-sm">Cards are disabled while you're judging</span>
            </div>
          </div>
        )}
        
        {hasSubmitted && !isJudging && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-green-900/30 border border-green-700 rounded-lg">
              <i className="fas fa-check-circle text-green-400 mr-2"></i>
              <span className="text-green-300 text-sm">Card submitted! Waiting for other players...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}
