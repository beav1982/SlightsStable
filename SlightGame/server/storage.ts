import {
  users,
  gameRooms,
  gamePlayers,
  slightCards,
  curseCards,
  roundSubmissions,
  type User,
  type UpsertUser,
  type GameRoom,
  type InsertGameRoom,
  type GamePlayer,
  type InsertGamePlayer,
  type SlightCard,
  type InsertSlightCard,
  type CurseCard,
  type InsertCurseCard,
  type RoundSubmission,
  type InsertRoundSubmission,
  type GameState,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, not } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Game room operations
  createGameRoom(room: InsertGameRoom): Promise<GameRoom>;
  getGameRoomByCode(code: string): Promise<GameRoom | undefined>;
  getGameRoom(id: number): Promise<GameRoom | undefined>;
  updateGameRoom(id: number, updates: Partial<GameRoom>): Promise<GameRoom>;

  // Player operations
  addPlayerToRoom(player: InsertGamePlayer): Promise<GamePlayer>;
  getPlayersInRoom(roomId: number): Promise<(GamePlayer & { user: User })[]>;
  updatePlayer(id: number, updates: Partial<GamePlayer>): Promise<GamePlayer>;
  removePlayerFromRoom(roomId: number, userId: string): Promise<void>;

  // Card operations
  getRandomSlightCard(): Promise<SlightCard>;
  getCurseCards(ids: number[]): Promise<CurseCard[]>;
  getRandomCurseCards(count: number): Promise<CurseCard[]>;
  seedCards(): Promise<void>;

  // Submission operations
  submitCard(submission: InsertRoundSubmission): Promise<RoundSubmission>;
  getRoundSubmissions(roomId: number, round: number): Promise<(RoundSubmission & { player: GamePlayer & { user: User }; card: CurseCard })[]>;
  markWinningSubmission(roomId: number, round: number, submissionId: number): Promise<void>;

  // Game state
  getGameState(roomId: number): Promise<GameState | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Game room operations
  async createGameRoom(room: InsertGameRoom): Promise<GameRoom> {
    const [newRoom] = await db.insert(gameRooms).values(room).returning();
    return newRoom;
  }

  async getGameRoomByCode(code: string): Promise<GameRoom | undefined> {
    const [room] = await db.select().from(gameRooms).where(eq(gameRooms.code, code));
    return room;
  }

  async getGameRoom(id: number): Promise<GameRoom | undefined> {
    const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, id));
    return room;
  }

  async updateGameRoom(id: number, updates: Partial<GameRoom>): Promise<GameRoom> {
    const [updatedRoom] = await db
      .update(gameRooms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gameRooms.id, id))
      .returning();
    return updatedRoom;
  }

  // Player operations
  async addPlayerToRoom(player: InsertGamePlayer): Promise<GamePlayer> {
    const [newPlayer] = await db.insert(gamePlayers).values(player).returning();
    return newPlayer;
  }

  async getPlayersInRoom(roomId: number): Promise<(GamePlayer & { user: User })[]> {
    const players = await db
      .select()
      .from(gamePlayers)
      .innerJoin(users, eq(gamePlayers.userId, users.id))
      .where(eq(gamePlayers.roomId, roomId))
      .orderBy(gamePlayers.joinOrder);

    return players.map(({ game_players, users }) => ({
      ...game_players,
      user: users,
    }));
  }

  async updatePlayer(id: number, updates: Partial<GamePlayer>): Promise<GamePlayer> {
    const [updatedPlayer] = await db
      .update(gamePlayers)
      .set(updates)
      .where(eq(gamePlayers.id, id))
      .returning();
    return updatedPlayer;
  }

  async removePlayerFromRoom(roomId: number, userId: string): Promise<void> {
    await db
      .delete(gamePlayers)
      .where(and(eq(gamePlayers.roomId, roomId), eq(gamePlayers.userId, userId)));
  }

  // Card operations
  async getRandomCurseCards(count: number): Promise<CurseCard[]> {
    const cards = await db.select().from(curseCards).orderBy(sql`RANDOM()`).limit(count);
    return cards;
  }

  async getRandomSlightCard(): Promise<SlightCard> {
    const [card] = await db.select().from(slightCards).orderBy(sql`RANDOM()`).limit(1);
    return card;
  }

  async getCurseCards(ids: number[]): Promise<CurseCard[]> {
    if (ids.length === 0) return [];
    
    const cards = await db
      .select()
      .from(curseCards)
      .where(inArray(curseCards.id, ids));
    return cards;
  }

  // Session-aware card dealing methods
  async getAvailableCurseCards(roomId: number, count: number): Promise<CurseCard[]> {
    const room = await this.getGameRoom(roomId);
    if (!room) return [];

    const dealtIds = Array.isArray(room.dealtCurseCardIds) ? room.dealtCurseCardIds as number[] : [];

    // Get all curse cards not yet dealt
    let availableCards: CurseCard[];
    if (dealtIds.length > 0) {
      availableCards = await db.select()
        .from(curseCards)
        .where(not(inArray(curseCards.id, dealtIds)))
        .orderBy(sql`RANDOM()`)
        .limit(count);
    } else {
      availableCards = await db.select()
        .from(curseCards)
        .orderBy(sql`RANDOM()`)
        .limit(count);
    }

    // If we don't have enough available cards, reset the dealt cards and get more
    if (availableCards.length < count) {
      console.log(`Resetting curse cards pool for room ${roomId} - all cards have been dealt`);
      await this.updateGameRoom(roomId, { dealtCurseCardIds: [] });
      availableCards = await db.select()
        .from(curseCards)
        .orderBy(sql`RANDOM()`)
        .limit(count);
    }

    // Mark these cards as dealt
    const newDealtIds = [...dealtIds, ...availableCards.map(c => c.id)];
    await this.updateGameRoom(roomId, { dealtCurseCardIds: newDealtIds });

    return availableCards;
  }

  async getAvailableSlightCard(roomId: number): Promise<SlightCard> {
    const room = await this.getGameRoom(roomId);
    if (!room) {
      return await this.getRandomSlightCard();
    }

    const dealtIds = Array.isArray(room.dealtSlightCardIds) ? room.dealtSlightCardIds as number[] : [];

    // Get a slight card not yet dealt
    let availableCards: SlightCard[];
    if (dealtIds.length > 0) {
      availableCards = await db.select()
        .from(slightCards)
        .where(not(inArray(slightCards.id, dealtIds)))
        .orderBy(sql`RANDOM()`)
        .limit(1);
    } else {
      availableCards = await db.select()
        .from(slightCards)
        .orderBy(sql`RANDOM()`)
        .limit(1);
    }

    // If no available cards, reset the pool
    if (availableCards.length === 0) {
      console.log(`Resetting slight cards pool for room ${roomId} - all cards have been dealt`);
      await this.updateGameRoom(roomId, { dealtSlightCardIds: [] });
      availableCards = await db.select()
        .from(slightCards)
        .orderBy(sql`RANDOM()`)
        .limit(1);
    }

    const selectedCard = availableCards[0];

    // Mark this card as dealt
    const newDealtIds = [...dealtIds, selectedCard.id];
    await this.updateGameRoom(roomId, { dealtSlightCardIds: newDealtIds });

    return selectedCard;
  }

  async seedCards(): Promise<void> {
    console.log('Seeding cards...');
    // Check if cards already exist
    const [slightCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(slightCards);

    console.log('Current slight card count:', slightCount.count);

    if (slightCount.count > 0) return;

    // Insert slight cards
    const slightCardTexts = [
      "I didn't use my turn signal when changing lanes.",
      "I listened to my music on a Bluetooth speaker in public.",
      "I put an empty milk jug in the fridge.",
      "I sent a 'just checking in!' text but never replied when they answered.",
      "I cut across two lanes to catch my exit at the last second.",
      "I left only one sheet on the toilet roll and didn't replace it.",
      "I farted in a sealed elevator.",
      "I talked through the entire movie, but only during the important parts.",
      "I puff puffed but didn't pass.",
      "I took my shoes off on a plane and put my bare feet on the seat in front of me.",
      "I let my phone go off during a funeral.",
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
      "I start every sentence with \"Honestly...\"",
      "I took a bite of someone's food without asking.",
      "I asked for some food after saying I wasn't hungry.",
      "I left my phone on full volume in a quiet place and didn't answer it.",
      "I still have Crazy Frog as my ringtone.",
      "I got drunk at my kid's T-ball game.",
      "I started a conversation about cupcakes with \"We need to talk.\"",
      "I played on my phone when someone was waiting for the bathroom.",
      "I left my wet laundry in the machine for hours, blocking everyone else from using it.",
      "I write LOL after every joke. LOL.",
      "I only talk about myself.",
      "I loudly cracked my knuckles in a silent room.",
      "I drove slowly in the fast lane.",
      "I took forever to text back, then just responded \"lol.\"",
      "I backwashed in someone's drink.",
      "I left a passive-aggressive sticky note instead of just talking to someone.",  
      "I double dipped.",
      "I stopped to text in the middle of a busy sidewalk.",
      "I got drunk at my work party.",
      "I said \"just a minute\" six hours ago.",
      "I took the biggest piece of cake without asking.",
      "I ruined a surprise party.",
      "I left the loaf of bread open.",
      "I took the batteries out of the remote and didn't put them back.",
      "I gave the most generic advice... \"stay in bed and drink plenty of fluids.\"",
      "I left my car parked across two spaces.",
      "I left my bright lights on while driving.",
      "I took my socks off and left them in the living room."
    ];

    await db.insert(slightCards).values(
      slightCardTexts.map(text => ({ text }))
    );

    // Insert curse cards
    const curseCardTexts = [
      "I hope your shower is always just slightly too cold.",
      "I hope your phone charger only works at a weird angle.",
      "I hope you always get a popcorn kernel stuck in your teeth.",
      "I hope you always feel like you forgot something, even when you didn't.",
      "I hope you always hear a cricket but never find it.",
      "I hope every TV show you love gets canceled after one season.",
      "I hope your socks are always slightly damp.",
      "I hope you always type 'teh' instead of 'the.'",
      "I hope every show you watch has spoilers in the thumbnails.",
      "I hope your pillow is always warm.",
      "I hope your earbuds are always tangled no matter how carefully you put them away.",
      "I hope your fitted sheet always pops off the corner of your bed.",
      "I hope your coffee is never just the right temperature.",
      "I hope every shopping cart you grab has a wobbly wheel.",
      "I hope you always sneeze four times in a row.",
      "I hope your phone screen is always just a little too dim.",
      "I hope you always lose your chapstick immediately after buying it.",
      "I hope your ice cream is always too melted or too frozen—never in between.",
      "I hope every time you try to fast forward, you accidentally restart the show instead.",
      "I hope you always drop a nickel when looking for change.",
      "I hope your sneakers always squeak.",
      "I hope every time you crack your knuckles, only one finger pops.",
      "I hope you always spray your hotdog with mustard juice.",
      "I hope your debit card always takes two swipes to work.",
      "I hope your allergies kick in out of season.",
      "I hope your Bluetooth randomly disconnects for no reason.",
      "I hope your car breaks down in a field full of fleas.",
      "I hope your glasses always have a tiny smudge you can't find.",
      "I hope your smoke alarm drains all your batteries CHIRP.",
      "I hope every door knob you touch gives you a static shock.",
      "I hope your voice cracks whenever you get mad.",
      "I hope every red light lasts exactly one second longer just for you.",
      "I hope you never turn right on red.",
      "I hope you always have a high ping.",
      "I hope your shoelaces always come untied at the worst possible moment.",
      "I hope you overtip by 10%.",
      "I hope every time you use a pen, it runs out of ink halfway through writing something important.",
      "I hope you never have the right condiments.",
      "I hope your phone battery percentage lies to you.",
      "I hope you do THAT for love.",
      "I hope every time you go to take a sip, your cup is just a little emptier than you expected.",
      "I hope your pinky toe always pokes through your sock.",
      "I hope your grocery bag always rips at the worst possible moment.",
      "I hope you never find ripe avocados.",
      "I hope your belt loops always get caught on doorknobs.",
      "I hope you stumble on things that aren't there.",
      "I hope your ice maker always gives you one cube less than you need.",
      "I hope your grilled cheese melts unevenly.",
      "I hope you spill a few drops of coffee on yourself before an important meeting.",
      "I hope you always get stuck behind someone walking painfully slow.",
      "I hope you always end up behind a school bus when you're running late.",
      "I hope your check engine light is always on.",
      "I hope your fork always has one bent prong.",
      "I hope your playlist always shuffles to the songs you skip.",
      "I hope your toilet seat is always cold.",
      "I hope every time you sit in a swivel chair, it leans back just a little too far.",
      "I hope people mistake your love for pineapples as something else.",
      "I hope nothing important happens to you today.",
      "I hope you tear up every time you yawn.",
      "I hope the next joke you hear goes over your head.",
      "I hope someone steals your bandwidth.",
      "I hope your Hot Pocket is done and done.",
      "I hope you have a 4K TV and a 720p DVD.",
      "I hope a friend finds something embarrassing in your couch.",
      "I hope you get a fairytale ending.",
      "I hope your DoorDash driver is creepy.",
      "I hope you are creative with writer's block.",
      "I hope you catch a hangnail on a piece of fabric.",
      "I hope you always have the wrong A-size battery.",
      "I hope your seatbelt locks.",
      "I hope you need to blow your nose and don't have tissues.",
      "I hope your dry erase markers leave a smudge.",
      "I hope your favorite mug always has just a little bit of coffee residue left in it.",
      "I hope your phone always slips just out of reach when you're lying down.",
      "I hope your autocorrect never learns your name.",
      "I hope your Wi-Fi signal drops right as you're about to win an online argument.",
      "I hope your favorite sweater always smells faintly of someone else's perfume.",
      "I hope your fridge makes that weird humming noise only when you're trying to sleep.",
      "I hope your favorite snack is always just expired when you grab it.",
      "I hope your alarm clock snooze button stops working when you need it most.",
      "I hope your straw always bends at the wrong angle and stabs your lip.",
      "I hope your headphones only play sound in one ear until you jiggle the cord just right.",
      "I hope every book you read has the last page torn out.",
      "I hope your car radio only picks up static on your favorite station.",
      "I hope your mouse cursor freezes for three seconds every time you click.",
      "I hope your toast is always burnt.",
      "I hope your umbrella flips inside out at the slightest breeze.",
      "I hope your favorite pen leaks just enough ink to ruin one important note.",
      "I hope every pair of jeans you own gets a tiny hole in the crotch.",
      "I hope your microwave popcorn always has twice as many unpopped kernels.",
      "I hope your chair always wobbles just enough to annoy you but not enough to fix.",
      "I hope your pizza delivery always forgets the extra sauce you paid for.",
      "I hope your shampoo bottle always falls over in the shower when it's almost empty.",
      "I hope your favorite shirt shrinks just enough to feel tight but not enough to replace.",
      "I hope your weather app always predicts the sun right before it pours.",
      "I hope your socks always slide down inside your shoes halfway through the day.",
      "I hope your printer jams every time you're in a hurry.",
      "I hope your keyboard misses exactly one letter every time you type a password.",
      "I hope your favorite candle burns out after five minutes every time you light it.",
      "I hope your streaming service buffers only during the best part of the movie."
    ];

    await db.insert(curseCards).values(
      curseCardTexts.map(text => ({ text }))
    );
  }

  // Submission operations
  async submitCard(submission: InsertRoundSubmission): Promise<RoundSubmission> {
    const [newSubmission] = await db.insert(roundSubmissions).values(submission).returning();
    return newSubmission;
  }

  async getRoundSubmissions(roomId: number, round: number): Promise<(RoundSubmission & { player: GamePlayer & { user: User }; card: CurseCard })[]> {
    const submissions = await db
      .select()
      .from(roundSubmissions)
      .innerJoin(gamePlayers, eq(roundSubmissions.playerId, gamePlayers.id))
      .innerJoin(users, eq(gamePlayers.userId, users.id))
      .innerJoin(curseCards, eq(roundSubmissions.cardId, curseCards.id))
      .where(and(eq(roundSubmissions.roomId, roomId), eq(roundSubmissions.round, round)));

    return submissions.map(({ round_submissions, game_players, users, curse_cards }) => ({
      ...round_submissions,
      player: { ...game_players, user: users },
      card: curse_cards,
    }));
  }

  async markWinningSubmission(roomId: number, round: number, submissionId: number): Promise<void> {
    await db
      .update(roundSubmissions)
      .set({ isWinner: true })
      .where(eq(roundSubmissions.id, submissionId));
  }

  // Game state
  async getGameState(roomId: number): Promise<GameState | undefined> {
    const room = await this.getGameRoom(roomId);
    if (!room) return undefined;

    const players = await this.getPlayersInRoom(roomId);
    const currentSlightCard = room.currentSlightCardId 
      ? await db.select().from(slightCards).where(eq(slightCards.id, room.currentSlightCardId)).then(cards => cards[0])
      : undefined;

    const submissions = await this.getRoundSubmissions(roomId, room.currentRound || 1);
    const currentJudge = room.currentJudgeIndex !== null ? players[room.currentJudgeIndex] : undefined;

    return {
      room,
      players,
      currentSlightCard,
      submissions,
      currentJudge,
    };
  }
}

export const storage = new DatabaseStorage();