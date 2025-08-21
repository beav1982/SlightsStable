import { Card, CardContent } from "@/components/ui/card";
import type { GamePlayer, User } from "@shared/schema";

interface ScoreboardProps {
  players: (GamePlayer & { user: User })[];
  currentJudge?: GamePlayer & { user: User };
  currentUserId: string;
  submissions?: any[];
}

export function Scoreboard({ players, currentJudge, currentUserId, submissions = [] }: ScoreboardProps) {
  const getPlayerStatus = (player: GamePlayer & { user: User }) => {
    if (currentJudge?.id === player.id) {
      return { text: "Judging", icon: "fas fa-gavel", color: "text-indigo-400" };
    }
    
    const hasSubmitted = submissions.some(s => s.player.id === player.id);
    if (hasSubmitted) {
      return { text: "Submitted", icon: "fas fa-check", color: "text-green-400" };
    }
    
    return { text: "Thinking...", icon: "fas fa-hourglass-half", color: "text-yellow-400" };
  };

  const getPlayerInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  const getPlayerName = (user: User) => {
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return "Player";
  };

  const getGradientClass = (index: number) => {
    const gradients = [
      "from-blue-500 to-purple-600",
      "from-green-500 to-emerald-600", 
      "from-pink-500 to-red-600",
      "from-orange-500 to-yellow-600",
      "from-indigo-500 to-blue-600",
      "from-purple-500 to-pink-600",
      "from-emerald-500 to-teal-600",
      "from-red-500 to-orange-600"
    ];
    return gradients[index % gradients.length];
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <i className="fas fa-trophy text-yellow-500 mr-2"></i>
          Scoreboard
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {players.map((player, index) => {
            const status = getPlayerStatus(player);
            const isCurrentUser = player.userId === currentUserId;
            const isJudge = currentJudge?.id === player.id;
            
            return (
              <div 
                key={player.id}
                className={`bg-slate-700/50 rounded-lg p-4 ${
                  isCurrentUser ? 'border-2 border-indigo-500' : ''
                } ${isJudge ? 'ring-2 ring-indigo-500/30' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${getGradientClass(index)} rounded-full flex items-center justify-center`}>
                    {player.user.profileImageUrl ? (
                      <img 
                        src={player.user.profileImageUrl} 
                        alt={getPlayerName(player.user)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {getPlayerInitials(player.user)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {isCurrentUser ? "You" : getPlayerName(player.user)}
                    </div>
                    <div className={`text-2xl font-bold ${
                      isCurrentUser ? 'text-indigo-400' : 'text-slate-300'
                    }`}>
                      {player.score || 0}
                    </div>
                  </div>
                </div>
                <div className={`mt-2 text-xs ${status.color}`}>
                  <i className={`${status.icon} mr-1`}></i>
                  {status.text}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
