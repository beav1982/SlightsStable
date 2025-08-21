import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [roomCode, setRoomCode] = useState("");
  const { toast } = useToast();

  const handleLogin = () => {
    window.location.href = "/api/login";
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
    
    // Store room code to join after login
    localStorage.setItem('pendingRoomCode', roomCode.toUpperCase());
    handleLogin();
  };

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
            <Button 
              onClick={handleLogin}
              variant="ghost" 
              className="text-slate-400 hover:text-white"
            >
              <i className="fas fa-user-circle text-2xl"></i>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-indigo-500 to-pink-500 p-6 rounded-2xl mb-6">
              <i className="fas fa-bolt text-white text-4xl"></i>
              <h1 className="text-4xl font-bold text-white">Slights</h1>
            </div>
          </div>
          <p className="text-2xl text-slate-300 mb-4 font-medium">A Game of Minor Inconveniences</p>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12">
            A petty party game where players deliver the ultimate minor revenge. 
            Match curses to slights in this hilarious multiplayer experience.
          </p>

          {/* Game Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              onClick={handleLogin}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold min-w-[200px] shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <i className="fas fa-plus mr-2"></i>
              Create Game
            </Button>
            <div className="flex items-center space-x-4">
              <span className="text-slate-500">or</span>
              <div className="flex space-x-2">
                <Input 
                  type="text" 
                  placeholder="Enter Room Code" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500 min-w-[150px]"
                  maxLength={6}
                />
                <Button 
                  onClick={handleJoinRoom}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 font-semibold"
                >
                  <i className="fas fa-sign-in-alt"></i>
                </Button>
              </div>
            </div>
          </div>

          {/* Sample Cards Preview */}
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-slate-300 mb-8">How It Works</h3>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Slight Card Example */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h4 className="text-pink-500 font-semibold mb-4 flex items-center">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Slight Card
                </h4>
                <Card className="bg-white text-slate-800 p-6 shadow-lg transform rotate-1 hover:rotate-0 transition-transform">
                  <CardContent className="p-0">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-slate-800 leading-relaxed">
                        "I left one sheet of toilet paper on the roll and didn't replace it"
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Curse Card Example */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h4 className="text-indigo-500 font-semibold mb-4 flex items-center">
                  <i className="fas fa-magic mr-2"></i>
                  Curse Card
                </h4>
                <Card className="bg-white text-slate-800 p-6 shadow-lg transform -rotate-1 hover:rotate-0 transition-transform">
                  <CardContent className="p-0">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-slate-800 leading-relaxed">
                        "I hope you always have socks that are slightly damp"
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Game Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="fas fa-users text-white text-xl"></i>
              </div>
              <h4 className="font-semibold text-white mb-2">Multiplayer Rooms</h4>
              <p className="text-slate-400 text-sm">Create or join rooms with unique codes. Play with friends anywhere.</p>
            </div>
            <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="fas fa-bolt text-white text-xl"></i>
              </div>
              <h4 className="font-semibold text-white mb-2">Real-Time Play</h4>
              <p className="text-slate-400 text-sm">Live updates, instant reactions, and seamless game flow.</p>
            </div>
            <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="fas fa-trophy text-white text-xl"></i>
              </div>
              <h4 className="font-semibold text-white mb-2">Rotating Judge</h4>
              <p className="text-slate-400 text-sm">Everyone gets a turn to pick the best curse. Fair and fun for all.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
