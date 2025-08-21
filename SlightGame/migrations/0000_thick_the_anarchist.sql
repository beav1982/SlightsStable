CREATE TABLE "curse_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"join_order" integer NOT NULL,
	"score" integer DEFAULT 0,
	"hand" jsonb DEFAULT '[]'::jsonb,
	"submitted_card_id" integer,
	"is_connected" boolean DEFAULT true,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(6) NOT NULL,
	"host_id" varchar NOT NULL,
	"max_players" integer DEFAULT 8,
	"target_score" integer DEFAULT 7,
	"current_round" integer DEFAULT 1,
	"current_judge_index" integer DEFAULT 0,
	"current_slight_card_id" integer,
	"dealt_curse_card_ids" jsonb DEFAULT '[]'::jsonb,
	"dealt_slight_card_ids" jsonb DEFAULT '[]'::jsonb,
	"game_state" varchar DEFAULT 'waiting',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "game_rooms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "round_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"round" integer NOT NULL,
	"player_id" integer NOT NULL,
	"card_id" integer NOT NULL,
	"is_winner" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slight_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");