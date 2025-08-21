import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { gameEngine } from "./gameEngine";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { friendsOnly } from "./friendsAuth";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database data
  await storage.seedCards();
  
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Game room routes
  app.post('/api/rooms/create', isAuthenticated, friendsOnly, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { targetScore = 7 } = req.body;
      
      const { code, roomId } = await gameEngine.createRoom(userId, targetScore);
      gameEngine.setClientRoom(userId, roomId);
      
      res.json({ code, roomId });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.post('/api/rooms/join', isAuthenticated, friendsOnly, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Room code is required" });
      }
      
      const result = await gameEngine.joinRoom(code.toUpperCase(), userId);
      if (result.success && result.roomId) {
        gameEngine.setClientRoom(userId, result.roomId);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ message: "Failed to join room" });
    }
  });

  app.post('/api/rooms/:roomId/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.roomId);
      
      const result = await gameEngine.startGame(roomId, userId);
      res.json(result);
    } catch (error) {
      console.error("Error starting game:", error);
      res.status(500).json({ message: "Failed to start game" });
    }
  });

  app.get('/api/rooms/:roomId/state', isAuthenticated, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const gameState = await storage.getGameState(roomId);
      
      if (!gameState) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      res.json(gameState);
    } catch (error) {
      console.error("Error fetching game state:", error);
      res.status(500).json({ message: "Failed to fetch game state" });
    }
  });

  app.get('/api/rooms/:roomId/hand', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.roomId);
      
      const hand = await gameEngine.getPlayerHand(roomId, userId);
      res.json(hand);
    } catch (error) {
      console.error("Error fetching player hand:", error);
      res.status(500).json({ message: "Failed to fetch player hand" });
    }
  });

  app.post('/api/rooms/:roomId/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.roomId);
      const { cardId } = req.body;
      
      if (!cardId || typeof cardId !== 'number') {
        return res.status(400).json({ message: "Card ID is required" });
      }
      
      const result = await gameEngine.submitCard(roomId, userId, cardId);
      res.json(result);
    } catch (error) {
      console.error("Error submitting card:", error);
      res.status(500).json({ message: "Failed to submit card" });
    }
  });

  app.post('/api/rooms/:roomId/judge', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.roomId);
      const { submissionId } = req.body;
      
      if (!submissionId || typeof submissionId !== 'number') {
        return res.status(400).json({ message: "Submission ID is required" });
      }
      
      const result = await gameEngine.judgeCard(roomId, userId, submissionId);
      res.json(result);
    } catch (error) {
      console.error("Error judging card:", error);
      res.status(500).json({ message: "Failed to judge card" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    let userId: string | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.userId) {
          userId = data.userId;
          gameEngine.addClient(data.userId, ws);
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        gameEngine.removeClient(userId);
      }
    });
  });

  return httpServer;
}
