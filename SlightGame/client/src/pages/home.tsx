import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [targetScore, setTargetScore] = useState(7);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rooms/create", { targetScore });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Room Created!",
        description: `Room code: ${data.code}`,
      });
      setLocation(`/room/${data.roomId}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/rooms/join", { code });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Joined Room!",
          description: `Welcome to room ${roomCode}`,
        });
        setLocation(`/room/${data.roomId}`);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to join room",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate();
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room code",
        variant: "destructive",
      });
      return;
    }
    joinRoomMutation.mutate(roomCode.toUpperCase());
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Check for pending room code from landing page
  useEffect(() => {
    const pendingCode = localStorage.getItem('pendingRoomCode');
    if (pendingCode) {
      localStorage.removeItem('pendingRoomCode');
      setRoomCode(pendingCode);
      joinRoomMutation.mutate(pendingCode);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-bolt text-white text-lg"></i>
              </div>
              <h1 className="text-xl font-bold text-white">Slights</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  {(user as any).profileImageUrl && (
                    <img 
                      src={(user as any).profileImageUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span className="text-white text-sm">
                    {(user as any).firstName || (user as any).email}
                  </span>
                </div>
              )}
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className="text-slate-400 hover:text-white"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome back{(user as any)?.firstName ? `, ${(user as any).firstName}` : ''}!
          </h1>
          <p className="text-xl text-slate-300">Ready to play some Slights?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Create Room Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <i className="fas fa-plus-circle text-indigo-500 mr-3"></i>
                Create New Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-6">
                Start a new game and invite your friends to join the fun!
              </p>
              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="target-score" className="text-white text-sm font-medium mb-2 block">
                    Rounds to Win
                  </Label>
                  <Select value={targetScore.toString()} onValueChange={(value) => setTargetScore(parseInt(value))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select rounds to win" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="3" className="text-white hover:bg-slate-600">3 rounds</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-slate-600">5 rounds</SelectItem>
                      <SelectItem value="7" className="text-white hover:bg-slate-600">7 rounds (Classic)</SelectItem>
                      <SelectItem value="10" className="text-white hover:bg-slate-600">10 rounds</SelectItem>
                      <SelectItem value="15" className="text-white hover:bg-slate-600">15 rounds (Epic)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-slate-400 text-xs mt-1">
                    First player to win {targetScore} round{targetScore !== 1 ? 's' : ''} wins the game
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCreateRoom}
                disabled={createRoomMutation.isPending}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-3"
              >
                {createRoomMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Create Room
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <i className="fas fa-sign-in-alt text-pink-500 mr-3"></i>
                Join Existing Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-6">
                Enter a room code to join an existing game.
              </p>
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-pink-500"
                  maxLength={6}
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={joinRoomMutation.isPending || !roomCode.trim()}
                  className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3"
                >
                  {joinRoomMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Joining...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Join Room
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Play */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">How to Play</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Read the Slight</h3>
              <p className="text-slate-400 text-sm">
                Someone did something mildly annoying. Time for petty revenge!
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Pick Your Curse</h3>
              <p className="text-slate-400 text-sm">
                Choose the most fitting minor inconvenience from your hand.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Judge Decides</h3>
              <p className="text-slate-400 text-sm">
                The judge picks their favorite curse. Best revenge wins!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
