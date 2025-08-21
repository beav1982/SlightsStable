import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { User, CurseCard } from "@shared/schema";

// Audio utility for winning chime
const playWinningChime = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant chime sequence
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    let startTime = audioContext.currentTime;
    
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Create envelope for natural sound
      gainNode.gain.setValueAtTime(0, startTime + index * 0.3);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + index * 0.3 + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + index * 0.3 + 0.8);
      
      oscillator.start(startTime + index * 0.3);
      oscillator.stop(startTime + index * 0.3 + 0.8);
    });
  } catch (error) {
    console.log('Audio playback not supported');
  }
};

interface WinningScreenProps {
  isOpen: boolean;
  winningCard: CurseCard;
  winnerName: string;
  onContinue: () => void;
}

export function WinningScreen({ isOpen, winningCard, winnerName, onContinue }: WinningScreenProps) {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(5);
      return;
    }

    // Play winning chime when screen opens
    playWinningChime();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Ensure the winning screen is shown for all players before continuing
          setTimeout(() => {
            onContinue();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onContinue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-1 rounded-xl max-w-md w-full animate-pulse">
        <Card className="bg-slate-900 border-0">
          <CardContent className="p-8 text-center">
            {/* Fireworks Header */}
            <div className="mb-6">
              <div className="text-6xl animate-bounce mb-2">
                🎆 🎇 ✨
              </div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                Winner!
              </h2>
              <p className="text-xl text-white">
                {winnerName} takes this round!
              </p>
            </div>

            {/* Winning Card */}
            <div className="mb-6">
              <div className="bg-slate-800 p-4 rounded-lg border-2 border-yellow-400/50">
                <p className="text-white text-lg leading-relaxed">
                  {winningCard.text}
                </p>
              </div>
            </div>

            {/* Fireworks Footer */}
            <div className="mb-6">
              <div className="text-4xl">
                🎉 🎊 🎆 🎇 🎉
              </div>
            </div>

            {/* Continue Button */}
            <div className="space-y-2">
              <Button 
                onClick={onContinue}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 text-lg"
              >
                Continue to Next Round
              </Button>
              <p className="text-slate-400 text-sm">
                Auto-continuing in {timeLeft} seconds...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}