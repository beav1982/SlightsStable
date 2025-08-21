import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GameCard } from "@/components/game/GameCard";
import { PlayerHand } from "@/components/game/PlayerHand";
import { Scoreboard } from "@/components/game/Scoreboard";
import { JudgeView } from "@/components/game/JudgeView";
import { PlayerView } from "@/components/game/PlayerView";
import { WinningScreen } from "@/components/game/WinningScreen";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { GameState, CurseCard } from "@shared/schema";

export default function GameRoom() {
  const params = useParams();
  const roomId = parseInt(params.roomId || "0");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { lastMessage } = useWebSocket() as any;
  const { toast } = useToast();
  const [selectedCardId, setSelectedCardId] = useState<number | undefined>(undefined);
  const [showWinningScreen, setShowWinningScreen] = useState(false);
  const [winningData, setWinningData] = useState<{
    card: CurseCard;
    playerName: string;
  } | null>(null);

  const { 
    data: gameState, 
    isLoading: gameLoading, 
    refetch: refetchGameState,
    error: gameError 
  } = useQuery<GameState>({
    queryKey: ["/api/rooms", roomId, "state"],
    enabled: isAuthenticated && roomId > 0,
    refetchInterval: 5000, // Fallback polling
  });

  const { 
    data: playerHand, 
    isLoading: handLoading, 
    refetch: refetchHand 
  } = useQuery<CurseCard[]>({
    queryKey: ["/api/rooms", roomId, "hand"],
    enabled: isAuthenticated && roomId > 0,
    refetchInterval: 10000, // Less frequent polling for hand
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.event) {
        case "player_joined":
        case "game_started":
        case "card_submitted":
        case "all_cards_submitted":
          refetchGameState();
          refetchHand();
          break;
        case "round_winner":
          // Always show winning screen with winner data - ensure all players see it
          console.log("Round winner event received:", lastMessage.data);
          if (lastMessage.data?.winningCard && lastMessage.data?.winner) {
            setWinningData({
              card: lastMessage.data.winningCard,
              playerName: lastMessage.data.winner.user?.firstName || 
                         lastMessage.data.winner.user?.email?.split('@')[0] || 
                         "Player"
            });
            setShowWinningScreen(true);
            // Clear any previous card selection
            setSelectedCardId(undefined);
          }
          setTimeout(() => {
            refetchGameState();
            refetchHand();
          }, 500); // Delay refresh to ensure winner screen shows
          break;
        case "next_round":
        case "game_finished":
          refetchGameState();
          refetchHand();
          break;
      }
    }
  }, [lastMessage, refetchGameState, refetchHand]);

  // Handle auth errors
  useEffect(() => {
    if (gameError && isUnauthorizedError(gameError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [gameError, toast]);

  const handleStartGame = async () => {
    if (!gameState) return;
    
    try {
      const response = await apiRequest("POST", `/api/rooms/${roomId}/start`, {});
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Game Started!",
          description: "Let the petty revenge begin!",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to start game",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyRoomCode = () => {
    if (gameState?.room.code) {
      navigator.clipboard.writeText(gameState.room.code);
      toast({
        title: "Room Code Copied!",
        description: `Room code ${gameState.room.code} copied to clipboard`,
      });
    }
  };

  if (authLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <i className="fas fa-spinner fa-spin text-3xl text-indigo-500 mb-4"></i>
            <div className="text-white">Loading game room...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-white mb-4">Please log in to continue</div>
            <Button onClick={() => window.location.href = "/api/login"}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-white mb-4">Room not found</div>
            <Button onClick={() => window.location.href = "/"}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userId = (user as any)?.id || "";
  const currentPlayer = gameState.players.find(p => p.userId === userId);
  const isHost = gameState.room.hostId === userId;
  const isJudge = gameState.currentJudge?.userId === userId;
  const hasSubmitted = gameState.submissions.some(s => s.player.userId === userId);
  const canStartGame = isHost && gameState.room.gameState === "waiting" && gameState.players.length >= 3;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-bolt text-white text-sm"></i>
                </div>
                <span className="font-bold text-white">Slights</span>
              </div>
              <div className="hidden sm:flex items-center space-x-2 bg-slate-800 rounded-lg px-3 py-2">
                <span className="text-slate-400 text-sm">Room:</span>
                <span className="text-white font-mono font-semibold">{gameState.room.code}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyRoomCode}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <i className="fas fa-copy text-xs"></i>
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-clock text-indigo-500"></i>
                  <span className="text-slate-300">
                    Round {gameState.room.currentRound} of {gameState.room.targetScore}
                  </span>
                </div>
                {gameState.currentJudge && (
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-gavel text-pink-500"></i>
                    <span className="text-slate-300">
                      Judge: {gameState.currentJudge.userId === userId ? "You" : 
                        (gameState.currentJudge.user.firstName || gameState.currentJudge.user.email?.split('@')[0] || "Player")}
                    </span>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost"
                onClick={() => window.location.href = "/"}
                className="text-slate-400 hover:text-white px-3 py-2"
                title="Exit Game"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                <span className="hidden sm:inline">Exit Game</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Scoreboard */}
        <div className="mb-6">
          <Scoreboard 
            players={gameState.players}
            currentJudge={gameState.currentJudge}
            currentUserId={userId}
            submissions={gameState.submissions}
          />
        </div>

        {/* Game State Specific Content */}
        {gameState.room.gameState === "waiting" && (
          <div className="text-center mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Waiting for Players</h2>
                <p className="text-slate-300 mb-4">
                  Players: {gameState.players.length}/8
                </p>
                <p className="text-slate-300 mb-6">
                  {gameState.players.length < 3 
                    ? `Need ${3 - gameState.players.length} more players to start (minimum 3)`
                    : "Ready to start!"
                  }
                </p>
                {canStartGame && (
                  <Button
                    onClick={handleStartGame}
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold px-8 py-3"
                  >
                    <i className="fas fa-play mr-2"></i>
                    Start Game
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {gameState.room.gameState === "playing" && gameState.currentSlightCard && (
          <>
            {/* Current Slight Card */}
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-slate-300 mb-4">I'm the Asshole</h3>
              <div className="max-w-md mx-auto">
                <GameCard
                  text={gameState.currentSlightCard.text}
                  type="slight"
                />
              </div>
            </div>

            {/* Judge or Player View */}
            <div className="mb-8">
              {isJudge ? (
                <JudgeView
                  roomId={roomId}
                  submissions={gameState.submissions}
                  totalPlayers={gameState.players.length}
                  onJudgmentComplete={() => {
                    refetchGameState();
                    refetchHand();
                  }}
                />
              ) : (
                <PlayerView
                  roomId={roomId}
                  hand={playerHand || []}
                  hasSubmitted={hasSubmitted}
                  selectedCardId={selectedCardId}
                  onCardSelect={setSelectedCardId}
                  onCardSubmit={() => {
                    refetchGameState();
                    refetchHand();
                  }}
                />
              )}
            </div>
          </>
        )}

        {gameState.room.gameState === "finished" && (
          <div className="text-center">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <CardContent className="p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-trophy text-white text-3xl"></i>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Game Over!</h2>
                <div className="text-xl text-slate-300 mb-6">
                  Winner: {gameState.players.find(p => (p.score || 0) >= (gameState.room.targetScore || 5))?.user.firstName || "Someone"}
                </div>
                <Button
                  onClick={() => window.location.href = "/"}
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold px-8 py-3"
                >
                  <i className="fas fa-home mr-2"></i>
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Player Hand */}
        {gameState.room.gameState === "playing" && playerHand && (
          <PlayerHand
            cards={playerHand}
            selectedCardId={selectedCardId}
            onCardSelect={isJudge ? undefined : setSelectedCardId}
            isJudging={isJudge}
            hasSubmitted={hasSubmitted}
          />
        )}
      </div>

      {/* Winning Screen Modal */}
      {winningData && (
        <WinningScreen
          isOpen={showWinningScreen}
          winningCard={winningData.card}
          winnerName={winningData.playerName}
          onContinue={() => {
            setShowWinningScreen(false);
            setWinningData(null);
          }}
        />
      )}
    </div>
  );
}
