var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer } from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  curseCards: () => curseCards,
  gamePlayers: () => gamePlayers,
  gamePlayersRelations: () => gamePlayersRelations,
  gameRooms: () => gameRooms,
  gameRoomsRelations: () => gameRoomsRelations,
  insertCurseCardSchema: () => insertCurseCardSchema,
  insertGamePlayerSchema: () => insertGamePlayerSchema,
  insertGameRoomSchema: () => insertGameRoomSchema,
  insertRoundSubmissionSchema: () => insertRoundSubmissionSchema,
  insertSlightCardSchema: () => insertSlightCardSchema,
  roundSubmissions: () => roundSubmissions,
  roundSubmissionsRelations: () => roundSubmissionsRelations,
  sessions: () => sessions,
  slightCards: () => slightCards,
  users: () => users
});
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var gameRooms = pgTable("game_rooms", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  hostId: varchar("host_id").notNull(),
  maxPlayers: integer("max_players").default(8),
  targetScore: integer("target_score").default(7),
  currentRound: integer("current_round").default(1),
  currentJudgeIndex: integer("current_judge_index").default(0),
  currentSlightCardId: integer("current_slight_card_id"),
  gameState: varchar("game_state").default("waiting"),
  // waiting, playing, finished
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var gamePlayers = pgTable("game_players", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: varchar("user_id").notNull(),
  joinOrder: integer("join_order").notNull(),
  score: integer("score").default(0),
  hand: jsonb("hand").default([]),
  // array of card IDs
  submittedCardId: integer("submitted_card_id"),
  isConnected: boolean("is_connected").default(true),
  joinedAt: timestamp("joined_at").defaultNow()
});
var slightCards = pgTable("slight_cards", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var curseCards = pgTable("curse_cards", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var roundSubmissions = pgTable("round_submissions", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  round: integer("round").notNull(),
  playerId: integer("player_id").notNull(),
  cardId: integer("card_id").notNull(),
  isWinner: boolean("is_winner").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var gameRoomsRelations = relations(gameRooms, ({ one, many }) => ({
  host: one(users, {
    fields: [gameRooms.hostId],
    references: [users.id]
  }),
  players: many(gamePlayers),
  currentSlightCard: one(slightCards, {
    fields: [gameRooms.currentSlightCardId],
    references: [slightCards.id]
  }),
  submissions: many(roundSubmissions)
}));
var gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gamePlayers.roomId],
    references: [gameRooms.id]
  }),
  user: one(users, {
    fields: [gamePlayers.userId],
    references: [users.id]
  }),
  submittedCard: one(curseCards, {
    fields: [gamePlayers.submittedCardId],
    references: [curseCards.id]
  })
}));
var roundSubmissionsRelations = relations(roundSubmissions, ({ one }) => ({
  room: one(gameRooms, {
    fields: [roundSubmissions.roomId],
    references: [gameRooms.id]
  }),
  player: one(gamePlayers, {
    fields: [roundSubmissions.playerId],
    references: [gamePlayers.id]
  }),
  card: one(curseCards, {
    fields: [roundSubmissions.cardId],
    references: [curseCards.id]
  })
}));
var insertGameRoomSchema = createInsertSchema(gameRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertGamePlayerSchema = createInsertSchema(gamePlayers).omit({
  id: true,
  joinedAt: true
});
var insertSlightCardSchema = createInsertSchema(slightCards).omit({
  id: true,
  createdAt: true
});
var insertCurseCardSchema = createInsertSchema(curseCards).omit({
  id: true,
  createdAt: true
});
var insertRoundSubmissionSchema = createInsertSchema(roundSubmissions).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, sql, inArray } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  // Game room operations
  async createGameRoom(room) {
    const [newRoom] = await db.insert(gameRooms).values(room).returning();
    return newRoom;
  }
  async getGameRoomByCode(code) {
    const [room] = await db.select().from(gameRooms).where(eq(gameRooms.code, code));
    return room;
  }
  async getGameRoom(id) {
    const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, id));
    return room;
  }
  async updateGameRoom(id, updates) {
    const [updatedRoom] = await db.update(gameRooms).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(gameRooms.id, id)).returning();
    return updatedRoom;
  }
  // Player operations
  async addPlayerToRoom(player) {
    const [newPlayer] = await db.insert(gamePlayers).values(player).returning();
    return newPlayer;
  }
  async getPlayersInRoom(roomId) {
    const players = await db.select().from(gamePlayers).innerJoin(users, eq(gamePlayers.userId, users.id)).where(eq(gamePlayers.roomId, roomId)).orderBy(gamePlayers.joinOrder);
    return players.map(({ game_players, users: users2 }) => ({
      ...game_players,
      user: users2
    }));
  }
  async updatePlayer(id, updates) {
    const [updatedPlayer] = await db.update(gamePlayers).set(updates).where(eq(gamePlayers.id, id)).returning();
    return updatedPlayer;
  }
  async removePlayerFromRoom(roomId, userId) {
    await db.delete(gamePlayers).where(and(eq(gamePlayers.roomId, roomId), eq(gamePlayers.userId, userId)));
  }
  // Card operations
  async getRandomSlightCard() {
    const [card] = await db.select().from(slightCards).orderBy(sql`RANDOM()`).limit(1);
    return card;
  }
  async getCurseCards(ids) {
    if (ids.length === 0) return [];
    const cards = await db.select().from(curseCards).where(inArray(curseCards.id, ids));
    return cards;
  }
  async getRandomCurseCards(count) {
    const cards = await db.select().from(curseCards).orderBy(sql`RANDOM()`).limit(count);
    return cards;
  }
  async seedCards() {
    console.log("Seeding cards...");
    const [slightCount] = await db.select({ count: sql`count(*)` }).from(slightCards);
    console.log("Current slight card count:", slightCount.count);
    if (slightCount.count > 0) return;
    const slightCardTexts = [
      "I didn't use my turn signal when changing lanes.",
      "I listened to my music on a Bluetooth speaker in public.",
      "I put an empty milk jug in the fridge.",
      "I sent a 'just checking in!' text but never replied when they answered.",
      "I cut across two lanes to catch my exit at the last second.",
      "I left a single sheet of toilet paper on the roll instead of replacing it.",
      "I farted in a sealed elevator.",
      "I talked through the entire movie, but only during the important parts.",
      "I puff puffed but didn't pass.",
      "I took my shoes off on a plane and put my bare feet on the seat in front of me.",
      "My phone went off during a funeral.",
      "I chewed with my mouth open while making direct eye contact.",
      "I wore way too much perfume or cologne.",
      "I FaceTimed someone in a public restroom.",
      "I blocked traffic for a TikTok video.",
      "I clapped when the plane landed.",
      "I cooked my steak well done.",
      "I left my shopping cart in the middle of the parking lot.",
      "I blamed the cat for something I did.",
      "I aggressively shook someone's hand even though they clearly had a drink in the other hand.",
      "I used up all the hot water.",
      "I kept hitting snooze on my alarm, waking everyone up every 5 minutes.",
      'I start every sentence with "Honestly..."',
      "I took a bite of someone's food without asking.",
      "I asked for some food after saying I wasn't hungry.",
      "I left my phone on full volume in a quiet place and didn't answer it.",
      "I still have Crazy Frog as my ringtone.",
      "I got drunk at my kid's T-ball game.",
      'I started a conversation about cupcakes with "We need to talk."',
      "I played on my phone when someone was waiting for the bathroom.",
      "I left my wet laundry in the machine for hours, blocking everyone else from using it.",
      "I write LOL after every joke. LOL.",
      "I only talk about myself.",
      "I loudly cracked my knuckles in a silent room.",
      "I drove slowly in the fast lane.",
      'I took forever to text back, then just responded "lol."',
      "I backwashed in someone's drink.",
      "I left a passive-aggressive sticky note instead of just talking to someone.",
      "I double dipped.",
      "I stopped to text in the middle of a busy sidewalk.",
      "I got drunk at my work party.",
      'I said "just a minute" six hours ago.',
      "I took the biggest piece of cake without asking.",
      "I ruined a surprise party.",
      "I left the loaf of bread open.",
      "I took the batteries out of the remote and didn't put them back.",
      'I gave the most generic advice... "stay in bed and drink plenty of fluids."',
      "I left my car parked across two spaces.",
      "I left my bright lights on while driving.",
      "I took my socks off and left them in the living room."
    ];
    await db.insert(slightCards).values(
      slightCardTexts.map((text2) => ({ text: text2 }))
    );
    const curseCardTexts = [
      "May your shower always be just slightly too cold.",
      "May your phone charger only work at a weird angle.",
      "May you always get a popcorn kernel stuck in your teeth.",
      "May you always feel like you forgot something, but you didn't.",
      "May you always hear a cricket but never find it.",
      "May every TV show you love gets canceled after one season.",
      "May your socks always be slightly damp.",
      "May you always type 'teh' instead of 'the.'",
      "May every show you watch have spoilers in the thumbnails.",
      "May your pillow always be warm.",
      "May your earbuds always be tangled no matter how carefully you put them away.",
      "May your fitted sheet always pop off the corner of your bed.",
      "May your coffee never be just the right temperature.",
      "May every shopping cart you grab have a wobbly wheel.",
      "May you always sneeze four times in a row.",
      "May your phone screen always be just a little too dim.",
      "May you always lose your chapstick immediately after buying it.",
      "May your ice cream always be too melted or too frozen\u2014never in between.",
      "May every time you try to fast forward, you accidentally restart the show instead.",
      "May you always drop a nickel when looking for change.",
      "May your sneakers always squeak.",
      "May every time you crack your knuckles, only one finger pops.",
      "May you always spray your hotdog with mustard juice.",
      "May your debit card always take two swipes to work.",
      "May your allergies kick in out of season.",
      "May your Bluetooth randomly disconnect for no reason.",
      "May your car break down in a field full of fleas.",
      "May your glasses always have a tiny smudge you can't find.",
      "May your smoke alarm drain all your batteries CHIRP.",
      "May every door knob you touch give you a static shock.",
      "May your voice crack whenever you get mad.",
      "May every red light last exactly one second longer just for you.",
      "May you never turn right on red.",
      "May you always have a high ping.",
      "May your shoelaces always come untied at the worst possible moment.",
      "May you overtip by 10%.",
      "Every time you use a pen, may it run out of ink halfway through writing something important.",
      "May you never have the right condiments.",
      "May your phone battery percentage lie to you.",
      "May you do THAT for love.",
      "May every time you go to take a sip, your cup is just a little emptier than you expected.",
      "May your pinky toe always poke through your sock.",
      "May your grocery bag always rip at the worst possible moment.",
      "May you never find ripe avocados.",
      "May your belt loops always get caught on doorknobs.",
      "May you stumble on things that aren't there.",
      "May your ice maker always give you one cube less than you need.",
      "May your grilled cheese melt unevenly.",
      "May you spill a few drops of coffee on yourself before an important meeting.",
      "May you always get stuck behind someone walking painfully slow.",
      "May you always end up behind a school bus when you're running late.",
      "May your check engine light always be on.",
      "May your fork always have one bent prong.",
      "May your playlist always shuffle to the songs you skip.",
      "May your toilet seat always be cold.",
      "May every time you sit in a swivel chair, it leans back just a little too far.",
      "May people mistake your love for pineapples as something else.",
      "May nothing important happen to you today.",
      "May you tear up every time you yawn.",
      "May the next joke you hear go over your head.",
      "May someone steal your bandwidth.",
      "May your Hot Pocket\u2026 done and done.",
      "May you have a 4K TV and a 720p DVD.",
      "May a friend find something embarrassing in your couch.",
      "May you get a fairytale ending.",
      "May your DoorDash driver be creepy.",
      "May you be creative with writer's block.",
      "May you catch a hangnail on a piece of fabric.",
      "May you always have the wrong A-size battery.",
      "May your seatbelt locks.",
      "May you need to blow your nose and don't have tissues.",
      "May your dry erase markers leave a smudge.",
      "May your favorite mug always have just a little bit of coffee residue left in it.",
      "May your phone always slip just out of reach when you're lying down.",
      "May your autocorrect never learn your name.",
      "May your Wi-Fi signal drop right as you're about to win an online argument.",
      "May your favorite sweater always smell faintly of someone else's perfume.",
      "May your fridge make that weird humming noise only when you're trying to sleep.",
      "May your favorite snack always be just expired when you grab it.",
      "May your alarm clock snooze button stop working when you need it most.",
      "May your straw always bend at the wrong angle and stab your lip.",
      "May your headphones only play sound in one ear until you jiggle the cord just right.",
      "May every book you read have the last page torn out.",
      "May your car radio only pick up static on your favorite station.",
      "May your mouse cursor freeze for three seconds every time you click.",
      "May your toast always be burnt.",
      "May your umbrella flip inside out at the slightest breeze.",
      "May your favorite pen leak just enough ink to ruin one important note.",
      "May every pair of jeans you own get a tiny hole in the crotch.",
      "May your microwave popcorn always have twice as many unpopped kernels.",
      "May your chair always wobble just enough to annoy you but not enough to fix.",
      "May your pizza delivery always forget the extra sauce you paid for.",
      "May your shampoo bottle always fall over in the shower when it's almost empty.",
      "May your favorite shirt shrink just enough to feel tight but not enough to replace.",
      "May your weather app always predict the sun right before it pours.",
      "May your socks always slide down inside your shoes halfway through the day.",
      "May your printer jam every time you're in a hurry.",
      "May your keyboard miss exactly one letter every time you type a password.",
      "May your favorite candle burn out after five minutes every time you light it.",
      "May your streaming service buffer only during the best part of the movie."
    ];
    await db.insert(curseCards).values(
      curseCardTexts.map((text2) => ({ text: text2 }))
    );
  }
  // Submission operations
  async submitCard(submission) {
    const [newSubmission] = await db.insert(roundSubmissions).values(submission).returning();
    return newSubmission;
  }
  async getRoundSubmissions(roomId, round) {
    const submissions = await db.select().from(roundSubmissions).innerJoin(gamePlayers, eq(roundSubmissions.playerId, gamePlayers.id)).innerJoin(users, eq(gamePlayers.userId, users.id)).innerJoin(curseCards, eq(roundSubmissions.cardId, curseCards.id)).where(and(eq(roundSubmissions.roomId, roomId), eq(roundSubmissions.round, round)));
    return submissions.map(({ round_submissions, game_players, users: users2, curse_cards }) => ({
      ...round_submissions,
      player: { ...game_players, user: users2 },
      card: curse_cards
    }));
  }
  async markWinningSubmission(roomId, round, submissionId) {
    await db.update(roundSubmissions).set({ isWinner: true }).where(eq(roundSubmissions.id, submissionId));
  }
  // Game state
  async getGameState(roomId) {
    const room = await this.getGameRoom(roomId);
    if (!room) return void 0;
    const players = await this.getPlayersInRoom(roomId);
    const currentSlightCard = room.currentSlightCardId ? await db.select().from(slightCards).where(eq(slightCards.id, room.currentSlightCardId)).then((cards) => cards[0]) : void 0;
    const submissions = await this.getRoundSubmissions(roomId, room.currentRound || 1);
    const currentJudge = room.currentJudgeIndex !== null ? players[room.currentJudgeIndex] : void 0;
    return {
      room,
      players,
      currentSlightCard,
      submissions,
      currentJudge
    };
  }
};
var storage = new DatabaseStorage();

// server/gameEngine.ts
import { WebSocket } from "ws";
var GameEngine = class {
  clients = /* @__PURE__ */ new Map();
  addClient(userId, ws2) {
    this.clients.set(userId, { ws: ws2, userId });
  }
  removeClient(userId) {
    this.clients.delete(userId);
  }
  setClientRoom(userId, roomId) {
    const client2 = this.clients.get(userId);
    if (client2) {
      client2.roomId = roomId;
    }
  }
  async broadcastToRoom(roomId, event, data) {
    const gameState = await storage.getGameState(roomId);
    if (!gameState) return;
    const playerIds = gameState.players.map((p) => p.userId);
    this.clients.forEach((client2, userId) => {
      if (playerIds.includes(userId) && client2.ws.readyState === WebSocket.OPEN) {
        client2.ws.send(JSON.stringify({ event, data }));
      }
    });
  }
  async createRoom(hostId, targetScore = 7) {
    let code;
    let existingRoom;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      existingRoom = await storage.getGameRoomByCode(code);
    } while (existingRoom);
    const room = await storage.createGameRoom({
      code,
      hostId,
      targetScore,
      maxPlayers: 8
      // Enforce maximum of 8 players
    });
    await storage.addPlayerToRoom({
      roomId: room.id,
      userId: hostId,
      joinOrder: 0,
      hand: []
    });
    await this.dealCardsToPlayer(room.id, hostId);
    return { code, roomId: room.id };
  }
  async joinRoom(code, userId) {
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
    if (players.some((p) => p.userId === userId)) {
      return { success: false, error: "You are already in this room" };
    }
    await storage.addPlayerToRoom({
      roomId: room.id,
      userId,
      joinOrder: players.length,
      hand: []
    });
    await this.dealCardsToPlayer(room.id, userId);
    await this.broadcastToRoom(room.id, "player_joined", { userId });
    return { success: true, roomId: room.id };
  }
  async startGame(roomId, hostId) {
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
    await storage.seedCards();
    const slightCard = await storage.getRandomSlightCard();
    await storage.updateGameRoom(roomId, {
      gameState: "playing",
      currentSlightCardId: slightCard.id,
      currentRound: 1,
      currentJudgeIndex: 0
    });
    await this.broadcastToRoom(roomId, "game_started", { slightCard });
    return { success: true };
  }
  async dealCardsToPlayer(roomId, userId) {
    const players = await storage.getPlayersInRoom(roomId);
    const player = players.find((p) => p.userId === userId);
    if (!player) return;
    const currentHand = Array.isArray(player.hand) ? player.hand : [];
    const cardsNeeded = 7 - currentHand.length;
    if (cardsNeeded <= 0) return;
    const newCards = await storage.getRandomCurseCards(cardsNeeded);
    const updatedHand = [...currentHand, ...newCards.map((c) => c.id)];
    await storage.updatePlayer(player.id, { hand: updatedHand });
  }
  async submitCard(roomId, userId, cardId) {
    const gameState = await storage.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: "Room not found" };
    }
    if (gameState.room.gameState !== "playing") {
      return { success: false, error: "Game not in progress" };
    }
    const player = gameState.players.find((p) => p.userId === userId);
    if (!player) {
      return { success: false, error: "Player not in room" };
    }
    if (gameState.currentJudge?.userId === userId) {
      return { success: false, error: "Judge cannot submit cards" };
    }
    const existingSubmission = gameState.submissions.find((s) => s.player.userId === userId);
    if (existingSubmission) {
      return { success: false, error: "Card already submitted" };
    }
    const hand = Array.isArray(player.hand) ? player.hand : [];
    if (!hand.includes(cardId)) {
      return { success: false, error: "Card not in hand" };
    }
    await storage.submitCard({
      roomId,
      round: gameState.room.currentRound || 1,
      playerId: player.id,
      cardId
    });
    const updatedHand = hand.filter((id) => id !== cardId);
    await storage.updatePlayer(player.id, { hand: updatedHand });
    await this.dealCardsToPlayer(roomId, userId);
    const updatedSubmissions = await storage.getRoundSubmissions(roomId, gameState.room.currentRound || 1);
    const nonJudgePlayers = gameState.players.filter((p) => p.id !== gameState.currentJudge?.id);
    if (updatedSubmissions.length === nonJudgePlayers.length) {
      await this.broadcastToRoom(roomId, "all_cards_submitted", {});
    } else {
      await this.broadcastToRoom(roomId, "card_submitted", { userId });
    }
    return { success: true };
  }
  async judgeCard(roomId, userId, submissionId) {
    const gameState = await storage.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: "Room not found" };
    }
    if (gameState.currentJudge?.userId !== userId) {
      return { success: false, error: "Only the judge can select winners" };
    }
    const submission = gameState.submissions.find((s) => s.id === submissionId);
    if (!submission) {
      return { success: false, error: "Submission not found" };
    }
    await storage.markWinningSubmission(roomId, gameState.room.currentRound || 1, submissionId);
    const newScore = (submission.player.score || 0) + 1;
    const updatedPlayer = await storage.updatePlayer(submission.player.id, {
      score: newScore
    });
    if (updatedPlayer.score && updatedPlayer.score >= (gameState.room.targetScore || 7)) {
      await storage.updateGameRoom(roomId, { gameState: "finished" });
      await this.broadcastToRoom(roomId, "game_finished", { winner: submission.player });
      return { success: true };
    }
    await this.startNextRound(roomId);
    return { success: true };
  }
  async startNextRound(roomId) {
    const gameState = await storage.getGameState(roomId);
    if (!gameState) return;
    const nextRound = (gameState.room.currentRound || 1) + 1;
    const nextJudgeIndex = ((gameState.room.currentJudgeIndex || 0) + 1) % gameState.players.length;
    const nextSlightCard = await storage.getRandomSlightCard();
    await storage.updateGameRoom(roomId, {
      currentRound: nextRound,
      currentJudgeIndex: nextJudgeIndex,
      currentSlightCardId: nextSlightCard.id
    });
    await this.broadcastToRoom(roomId, "next_round", {
      round: nextRound,
      judgeIndex: nextJudgeIndex,
      slightCard: nextSlightCard
    });
  }
  async getPlayerHand(roomId, userId) {
    const players = await storage.getPlayersInRoom(roomId);
    const player = players.find((p) => p.userId === userId);
    if (!player) return [];
    const hand = Array.isArray(player.hand) ? player.hand : [];
    if (hand.length === 0) return [];
    return await storage.getCurseCards(hand);
  }
};
var gameEngine = new GameEngine();

// server/replitAuth.ts
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`
      },
      verify
    );
    passport.use(strategy);
  }
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  app2.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// server/routes.ts
async function registerRoutes(app2) {
  await storage.seedCards();
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.post("/api/rooms/create", isAuthenticated, async (req, res) => {
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
  app2.post("/api/rooms/join", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;
      if (!code || typeof code !== "string") {
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
  app2.post("/api/rooms/:roomId/start", isAuthenticated, async (req, res) => {
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
  app2.get("/api/rooms/:roomId/state", isAuthenticated, async (req, res) => {
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
  app2.get("/api/rooms/:roomId/hand", isAuthenticated, async (req, res) => {
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
  app2.post("/api/rooms/:roomId/submit", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.roomId);
      const { cardId } = req.body;
      if (!cardId || typeof cardId !== "number") {
        return res.status(400).json({ message: "Card ID is required" });
      }
      const result = await gameEngine.submitCard(roomId, userId, cardId);
      res.json(result);
    } catch (error) {
      console.error("Error submitting card:", error);
      res.status(500).json({ message: "Failed to submit card" });
    }
  });
  app2.post("/api/rooms/:roomId/judge", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const roomId = parseInt(req.params.roomId);
      const { submissionId } = req.body;
      if (!submissionId || typeof submissionId !== "number") {
        return res.status(400).json({ message: "Submission ID is required" });
      }
      const result = await gameEngine.judgeCard(roomId, userId, submissionId);
      res.json(result);
    } catch (error) {
      console.error("Error judging card:", error);
      res.status(500).json({ message: "Failed to judge card" });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws2, req) => {
    let userId = null;
    ws2.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "auth" && data.userId) {
          userId = data.userId;
          gameEngine.addClient(userId, ws2);
          ws2.send(JSON.stringify({ type: "auth_success" }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws2.on("close", () => {
      if (userId) {
        gameEngine.removeClient(userId);
      }
    });
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
