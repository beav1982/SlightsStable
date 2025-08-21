import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game rooms
export const gameRooms = pgTable("game_rooms", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  hostId: varchar("host_id").notNull(),
  maxPlayers: integer("max_players").default(8),
  targetScore: integer("target_score").default(7),
  currentRound: integer("current_round").default(1),
  currentJudgeIndex: integer("current_judge_index").default(0),
  currentSlightCardId: integer("current_slight_card_id"),
  dealtCurseCardIds: jsonb("dealt_curse_card_ids").default([]), // array of dealt card IDs
  dealtSlightCardIds: jsonb("dealt_slight_card_ids").default([]), // array of dealt slight card IDs
  gameState: varchar("game_state").default("waiting"), // waiting, playing, finished
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Players in game rooms
export const gamePlayers = pgTable("game_players", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: varchar("user_id").notNull(),
  joinOrder: integer("join_order").notNull(),
  score: integer("score").default(0),
  hand: jsonb("hand").default([]), // array of card IDs
  submittedCardId: integer("submitted_card_id"),
  isConnected: boolean("is_connected").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Slight cards (black cards)
export const slightCards = pgTable("slight_cards", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Curse cards (white cards)
export const curseCards = pgTable("curse_cards", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Round submissions
export const roundSubmissions = pgTable("round_submissions", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  round: integer("round").notNull(),
  playerId: integer("player_id").notNull(),
  cardId: integer("card_id").notNull(),
  isWinner: boolean("is_winner").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const gameRoomsRelations = relations(gameRooms, ({ one, many }) => ({
  host: one(users, {
    fields: [gameRooms.hostId],
    references: [users.id],
  }),
  players: many(gamePlayers),
  currentSlightCard: one(slightCards, {
    fields: [gameRooms.currentSlightCardId],
    references: [slightCards.id],
  }),
  submissions: many(roundSubmissions),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gamePlayers.roomId],
    references: [gameRooms.id],
  }),
  user: one(users, {
    fields: [gamePlayers.userId],
    references: [users.id],
  }),
  submittedCard: one(curseCards, {
    fields: [gamePlayers.submittedCardId],
    references: [curseCards.id],
  }),
}));

export const roundSubmissionsRelations = relations(roundSubmissions, ({ one }) => ({
  room: one(gameRooms, {
    fields: [roundSubmissions.roomId],
    references: [gameRooms.id],
  }),
  player: one(gamePlayers, {
    fields: [roundSubmissions.playerId],
    references: [gamePlayers.id],
  }),
  card: one(curseCards, {
    fields: [roundSubmissions.cardId],
    references: [curseCards.id],
  }),
}));

// Insert schemas
export const insertGameRoomSchema = createInsertSchema(gameRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGamePlayerSchema = createInsertSchema(gamePlayers).omit({
  id: true,
  joinedAt: true,
});

export const insertSlightCardSchema = createInsertSchema(slightCards).omit({
  id: true,
  createdAt: true,
});

export const insertCurseCardSchema = createInsertSchema(curseCards).omit({
  id: true,
  createdAt: true,
});

export const insertRoundSubmissionSchema = createInsertSchema(roundSubmissions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type InsertGamePlayer = z.infer<typeof insertGamePlayerSchema>;
export type SlightCard = typeof slightCards.$inferSelect;
export type InsertSlightCard = z.infer<typeof insertSlightCardSchema>;
export type CurseCard = typeof curseCards.$inferSelect;
export type InsertCurseCard = z.infer<typeof insertCurseCardSchema>;
export type RoundSubmission = typeof roundSubmissions.$inferSelect;
export type InsertRoundSubmission = z.infer<typeof insertRoundSubmissionSchema>;

// Game state types
export type GameState = {
  room: GameRoom;
  players: (GamePlayer & { user: User })[];
  currentSlightCard?: SlightCard;
  submissions: (RoundSubmission & { player: GamePlayer & { user: User }; card: CurseCard })[];
  currentJudge?: GamePlayer & { user: User };
};
