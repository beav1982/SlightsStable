import { storage } from "./storage";
import { WebSocket } from "ws";
import type { GameState, CurseCard } from "@shared/schema";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  roomId?: number;
}

class GameEngine {
  private clients = new Map<string, ConnectedClient>();

  addClient(userId: string, ws: WebSocket) {
    this.clients.set(userId, { ws, userId });
  }

  removeClient(userId: string) {
    this.clients.delete(userId);
  }

  setClientRoom(userId: string, roomId: number) {
    const client = this.clients.get(userId);
    if (client) {
      client.roomId = roomId;
    }
  }

  async broadcastToRoom(roomId: number, event: string, data: any) {
    const gameState = await storage.getGameState(roomId);
    if (!gameState) return;

    const playerIds = gameState.players.map(p => p.userId);
    
    this.clients.forEach((client, userId) => {
      if (playerIds.includes(userId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ event, data }));
      }
    });
  }

  async createRoom(hostId: string, targetScore: number = 7): Promise<{ code: string; roomId: number }> {
    // Generate unique room code
    let code: string;
    let existingRoom;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      existingRoom = await storage.getGameRoomByCode(code);
    } while (existingRoom);

    // Create room with player limits
    const room = await storage.createGameRoom({
      code,
      hostId,
      targetScore,
      maxPlayers: 8, // Enforce maximum of 8 players
    });

    // Add host as first player
    await storage.addPlayerToRoom({
      roomId: room.id,
      userId: hostId,
      joinOrder: 0,
      hand: [],
    });

    // Deal initial cards to host
    await this.dealCardsToPlayer(room.id, hostId);

    return { code, roomId: room.id };
  }

  async joinRoom(code: string, userId: string): Promise<{ success: boolean; roomId?: number; error?: string }> {
    const room = await storage.getGameRoomByCode(code);
    if (!room) {
      return { success: false, error: "Room not found" };
    }

    if (room.gameState !== "waiting") {
      return { success: false, error: "Game already in progress" };
    }

    const players = await storage.getPlayersInRoom(room.id);
    const maxPlayers = room.maxPlayers || 8;
    if (players.length >= maxPlayers) {
      return { success: false, error: "Room is full (maximum 8 players)" };
    }

    // Check if player already in room
    if (players.some(p => p.userId === userId)) {
      return { success: false, error: "You are already in this room" };
    }

    // Add player
    await storage.addPlayerToRoom({
      roomId: room.id,
      userId,
      joinOrder: players.length,
      hand: [],
    });

    // Deal initial cards
    await this.dealCardsToPlayer(room.id, userId);

    // Broadcast updated game state
    await this.broadcastToRoom(room.id, "player_joined", { userId });

    return { success: true, roomId: room.id };
  }

  async startGame(roomId: number, hostId: string): Promise<{ success: boolean; error?: string }> {
    const room = await storage.getGameRoom(roomId);
    if (!room || room.hostId !== hostId) {
      return { success: false, error: "Unauthorized" };
    }

    const players = await storage.getPlayersInRoom(roomId);
    if (players.length < 3) {
      return { success: false, error: "Need at least 3 players to start the game" };
    }
    
    if (players.length > 8) {
      return { success: false, error: "Too many players (maximum 8 players)" };
    }

    // Seed cards if not already done
    await storage.seedCards();

    // Pick first slight card
    const slightCard = await storage.getAvailableSlightCard(roomId);

    // Update room state
    await storage.updateGameRoom(roomId, {
      gameState: "playing",
      currentSlightCardId: slightCard.id,
      currentRound: 1,
      currentJudgeIndex: 0,
    });

    // Broadcast game started
    await this.broadcastToRoom(roomId, "game_started", { slightCard });

    return { success: true };
  }

  async dealCardsToPlayer(roomId: number, userId: string): Promise<void> {
    const players = await storage.getPlayersInRoom(roomId);
    const player = players.find(p => p.userId === userId);
    if (!player) return;

    const currentHand = Array.isArray(player.hand) ? player.hand as number[] : [];
    const cardsNeeded = 7 - currentHand.length;
    
    if (cardsNeeded <= 0) return;

    const newCards = await storage.getAvailableCurseCards(roomId, cardsNeeded);
    const updatedHand = [...currentHand, ...newCards.map(c => c.id)];

    await storage.updatePlayer(player.id, { hand: updatedHand });
  }

  async submitCard(roomId: number, userId: string, cardId: number): Promise<{ success: boolean; error?: string }> {
    const gameState = await storage.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: "Room not found" };
    }

    if (gameState.room.gameState !== "playing") {
      return { success: false, error: "Game not in progress" };
    }

    const player = gameState.players.find(p => p.userId === userId);
    if (!player) {
      return { success: false, error: "Player not in room" };
    }

    // Check if player is the judge
    if (gameState.currentJudge?.userId === userId) {
      return { success: false, error: "Judge cannot submit cards" };
    }

    // Check if player already submitted
    const existingSubmission = gameState.submissions.find(s => s.player.userId === userId);
    if (existingSubmission) {
      return { success: false, error: "Card already submitted" };
    }

    // Check if card is in player's hand
    const hand = Array.isArray(player.hand) ? player.hand as number[] : [];
    if (!hand.includes(cardId)) {
      return { success: false, error: "Card not in hand" };
    }

    // Submit card
    await storage.submitCard({
      roomId,
      round: gameState.room.currentRound || 1,
      playerId: player.id,
      cardId,
    });

    // Remove card from hand and deal new one
    const updatedHand = hand.filter(id => id !== cardId);
    await storage.updatePlayer(player.id, { hand: updatedHand });
    await this.dealCardsToPlayer(roomId, userId);

    // Check if all players have submitted
    const updatedSubmissions = await storage.getRoundSubmissions(roomId, gameState.room.currentRound || 1);
    const nonJudgePlayers = gameState.players.filter(p => p.id !== gameState.currentJudge?.id);
    
    if (updatedSubmissions.length === nonJudgePlayers.length) {
      await this.broadcastToRoom(roomId, "all_cards_submitted", {});
    } else {
      await this.broadcastToRoom(roomId, "card_submitted", { userId });
    }

    return { success: true };
  }

  async judgeCard(roomId: number, userId: string, submissionId: number): Promise<{ success: boolean; error?: string }> {
    const gameState = await storage.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: "Room not found" };
    }

    // Check if user is the judge
    if (gameState.currentJudge?.userId !== userId) {
      return { success: false, error: "Only the judge can select winners" };
    }

    // Find the submission
    const submission = gameState.submissions.find(s => s.id === submissionId);
    if (!submission) {
      return { success: false, error: "Submission not found" };
    }

    // Mark as winner and update score
    await storage.markWinningSubmission(roomId, gameState.room.currentRound || 1, submissionId);
    const newScore = (submission.player.score || 0) + 1;
    console.log(`Updating player ${submission.player.id} score from ${submission.player.score || 0} to ${newScore}`);
    const updatedPlayer = await storage.updatePlayer(submission.player.id, { 
      score: newScore 
    });
    console.log(`Player ${updatedPlayer.id} updated score: ${updatedPlayer.score}`);

    // Broadcast round winner to all players
    await this.broadcastToRoom(roomId, "round_winner", {
      winner: { ...submission.player, score: newScore },
      winningCard: submission.card,
      round: gameState.room.currentRound || 1,
    });

    // Check if game should end
    if (updatedPlayer.score && updatedPlayer.score >= (gameState.room.targetScore || 7)) {
      await storage.updateGameRoom(roomId, { gameState: "finished" });
      await this.broadcastToRoom(roomId, "game_finished", { winner: submission.player });
      return { success: true };
    }

    // Start next round with winner as next judge after a delay
    setTimeout(async () => {
      await this.startNextRound(roomId, submission.player);
    }, 6000); // 6 second delay to allow winning screen to show

    return { success: true };
  }

  async startNextRound(roomId: number, winnerPlayer?: any): Promise<void> {
    const gameState = await storage.getGameState(roomId);
    if (!gameState) return;

    const nextRound = (gameState.room.currentRound || 1) + 1;
    
    // If there's a winner, they become the next judge
    let nextJudgeIndex: number;
    if (winnerPlayer) {
      nextJudgeIndex = gameState.players.findIndex(p => p.id === winnerPlayer.id);
      if (nextJudgeIndex === -1) {
        // Fallback to sequential rotation if winner not found
        nextJudgeIndex = ((gameState.room.currentJudgeIndex || 0) + 1) % gameState.players.length;
      }
    } else {
      // Fallback to sequential rotation
      nextJudgeIndex = ((gameState.room.currentJudgeIndex || 0) + 1) % gameState.players.length;
    }
    
    const nextSlightCard = await storage.getAvailableSlightCard(roomId);

    await storage.updateGameRoom(roomId, {
      currentRound: nextRound,
      currentJudgeIndex: nextJudgeIndex,
      currentSlightCardId: nextSlightCard.id,
    });

    await this.broadcastToRoom(roomId, "next_round", {
      round: nextRound,
      judgeIndex: nextJudgeIndex,
      slightCard: nextSlightCard,
    });
  }

  async getPlayerHand(roomId: number, userId: string): Promise<CurseCard[]> {
    const players = await storage.getPlayersInRoom(roomId);
    const player = players.find(p => p.userId === userId);
    if (!player) return [];

    const hand = Array.isArray(player.hand) ? player.hand as number[] : [];
    if (hand.length === 0) return [];

    return await storage.getCurseCards(hand);
  }
}

export const gameEngine = new GameEngine();
