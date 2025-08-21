import { useState, useEffect } from "react";
import { GameCard } from "./GameCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoundSubmission, GamePlayer, User, CurseCard } from "@shared/schema";

interface JudgeViewProps {
  roomId: number;
  submissions: (RoundSubmission & { player: GamePlayer & { user: User }; card: CurseCard })[];
  totalPlayers: number;
  onJudgmentComplete?: () => void;
}

export function JudgeView({ roomId, submissions, totalPlayers, onJudgmentComplete }: JudgeViewProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [shuffledSubmissions, setShuffledSubmissions] = useState<(RoundSubmission & { player: GamePlayer & { user: User }; card: CurseCard })[]>([]);
  const { toast } = useToast();

  const judgeMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await apiRequest("POST", `/api/rooms/${roomId}/judge`, { submissionId });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Winner Selected!",
          description: "Moving to next round...",
        });
        onJudgmentComplete?.();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to select winner",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Judge error:", error);
      toast({
        title: "Error",
        description: "Failed to select winner. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectWinner = () => {
    if (selectedSubmissionId) {
      judgeMutation.mutate(selectedSubmissionId);
    }
  };

  // Total players minus judge minus submissions received
  const expectedSubmissions = totalPlayers - 1; // -1 for the judge
  const allSubmissionsIn = submissions.length >= expectedSubmissions;
  const waitingPlaceholders = allSubmissionsIn ? 0 : Math.max(0, expectedSubmissions - submissions.length);

  // Shuffle submissions when all are in to hide player identity from judge
  useEffect(() => {
    if (allSubmissionsIn && submissions.length > 0) {
      const shuffled = [...submissions].sort(() => Math.random() - 0.5);
      setShuffledSubmissions(shuffled);
    } else {
      setShuffledSubmissions([]);
    }
  }, [allSubmissionsIn, submissions]);

  return (
    <Card className="bg-gradient-to-r from-indigo-500/20 to-pink-500/20 border-indigo-500/30">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <i className="fas fa-gavel text-indigo-500 mr-3"></i>
          You're the Judge! Pick the best curse:
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Show shuffled submissions only when all are in */}
          {allSubmissionsIn ? (
            shuffledSubmissions.map((submission) => (
              <div key={submission.id} className="relative">
                <GameCard
                  text={submission.card.text}
                  type="curse"
                  isSelected={selectedSubmissionId === submission.id}
                  isJudgeView={true}
                  onClick={() => setSelectedSubmissionId(submission.id)}
                  className={
                    selectedSubmissionId === submission.id
                      ? "border-2 border-indigo-500 ring-2 ring-indigo-500/30"
                      : "border-2 border-transparent hover:border-indigo-500"
                  }
                />
              </div>
            ))
          ) : (
            /* Show hidden card placeholders while waiting */
            Array.from({ length: expectedSubmissions }).map((_, index) => (
              <Card key={`hidden-${index}`} className="bg-slate-800/50 border-2 border-slate-600">
                <CardContent className="p-6 flex items-center justify-center min-h-[140px]">
                  <div className="text-center text-slate-400">
                    <i className="fas fa-question text-3xl mb-2"></i>
                    <div className="text-sm font-semibold">Hidden</div>
                    <div className="text-xs">Until all submit</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {allSubmissionsIn && (
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setSelectedSubmissionId(null)}
              disabled={judgeMutation.isPending}
              className="bg-slate-600 hover:bg-slate-500 text-white border-slate-500 hover:border-slate-400"
            >
              <i className="fas fa-times mr-2"></i>
              Clear Selection
            </Button>
            <Button
              onClick={handleSelectWinner}
              disabled={!selectedSubmissionId || judgeMutation.isPending}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold px-8 shadow-lg"
            >
              {judgeMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Selecting Winner...
                </>
              ) : (
                <>
                  <i className="fas fa-crown mr-2"></i>
                  Select Winner
                </>
              )}
            </Button>
          </div>
        )}

        {!allSubmissionsIn && (
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-900/30 border border-blue-700 rounded-lg">
              <i className="fas fa-clock text-blue-400 mr-2"></i>
              <span className="text-blue-300 text-sm">
                Waiting for {expectedSubmissions - submissions.length} more player{(expectedSubmissions - submissions.length) !== 1 ? 's' : ''} to submit...
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Cards will be shuffled and revealed when all players submit
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
