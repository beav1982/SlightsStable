import { useState } from "react";
import { GameCard } from "./GameCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CurseCard } from "@shared/schema";

interface PlayerViewProps {
  roomId: number;
  hand: CurseCard[];
  hasSubmitted: boolean;
  onCardSubmit?: () => void;
  selectedCardId?: number;
  onCardSelect?: (cardId: number | undefined) => void;
}

export function PlayerView({ roomId, hand, hasSubmitted, onCardSubmit, selectedCardId, onCardSelect }: PlayerViewProps) {
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async (cardId: number) => {
      const response = await apiRequest("POST", `/api/rooms/${roomId}/submit`, { cardId });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Card Submitted!",
          description: "Waiting for other players...",
        });
        onCardSelect?.(undefined);
        onCardSubmit?.();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit card",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: "Failed to submit card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitCard = () => {
    if (selectedCardId) {
      submitMutation.mutate(selectedCardId);
    }
  };

  const selectedCard = hand.find(card => card.id === selectedCardId);

  if (hasSubmitted) {
    return (
      <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <i className="fas fa-check-circle text-green-500 mr-3"></i>
            Card Submitted!
          </h3>
          <div className="text-center">
            <div className="inline-flex items-center px-6 py-3 bg-green-900/30 border border-green-700 rounded-lg">
              <i className="fas fa-hourglass-half text-green-400 mr-2"></i>
              <span className="text-green-300">Waiting for other players and the judge...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-indigo-500/20 to-pink-500/20 border-indigo-500/30">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <i className="fas fa-hand-pointer text-indigo-500 mr-3"></i>
          Choose your curse:
        </h3>
        
        {selectedCard && (
          <div className="max-w-md mx-auto mb-6">
            <GameCard
              text={selectedCard.text}
              type="curse"
              isSelected={true}
              className="border-2 border-indigo-500 ring-2 ring-indigo-500/20"
            />
          </div>
        )}
        
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => onCardSelect?.(undefined)}
            disabled={!selectedCardId || submitMutation.isPending}
            className="bg-slate-600 hover:bg-slate-500 text-white border-slate-500 hover:border-slate-400"
          >
            <i className="fas fa-times mr-2"></i>
            Change Card
          </Button>
          <Button
            onClick={handleSubmitCard}
            disabled={!selectedCardId || submitMutation.isPending}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold px-8 shadow-lg"
          >
            {submitMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Submitting...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane mr-2"></i>
                Submit Curse
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
