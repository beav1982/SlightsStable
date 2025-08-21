# Slights - Card Game Application

## Overview

Slights is a real-time multiplayer card game application built with a full-stack TypeScript architecture. Players submit "curse cards" in response to "slight cards" (describing minor offenses), and a rotating judge selects the best match each round. The game features real-time gameplay, user authentication, and a modern web interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state
- **Build Tool**: Vite with custom configuration for development

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Real-time Communication**: WebSocket server for live game updates
- **Game Engine**: Custom game logic with in-memory state management
- **Session Management**: Express sessions with PostgreSQL storage

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless adapter
- **ORM**: Drizzle ORM with schema-first approach
- **Migration Strategy**: Drizzle Kit for database migrations
- **Session Store**: PostgreSQL-backed session storage using connect-pg-simple

## Key Components

### Authentication System
- **Provider**: Replit OIDC authentication
- **Strategy**: Passport.js with OpenID Connect
- **Session Handling**: Secure HTTP-only cookies with PostgreSQL persistence
- **User Management**: Automatic user creation/updates on authentication

### Game Engine
- **Real-time State**: WebSocket connections for live game updates
- **Room Management**: Unique room codes for game sessions
- **Player Management**: Join/leave functionality with room capacity limits
- **Game Logic**: Round-based gameplay with rotating judge system
- **Card System**: Separate slight cards (prompts) and curse cards (responses)

### Database Schema
- **Users**: Profile information with Replit integration
- **Game Rooms**: Room metadata, settings, and current state
- **Game Players**: Player-specific data within rooms
- **Cards**: Slight cards (prompts) and curse cards (player responses)
- **Round Submissions**: Player card submissions per round
- **Sessions**: Secure session storage

### UI Components
- **Game Cards**: Interactive card display with selection states
- **Player Hand**: Card management interface
- **Scoreboard**: Real-time player status and scoring
- **Judge/Player Views**: Role-specific game interfaces
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

## Data Flow

### Authentication Flow
1. User clicks login → Redirects to Replit OIDC
2. Successful authentication → User profile stored/updated in database
3. Session established → JWT tokens managed by Passport
4. Frontend queries user data → React Query caches authentication state

### Game Flow
1. Host creates room → Unique code generated, room stored in database
2. Players join via code → WebSocket connections established
3. Game starts → Slight card drawn, players receive curse cards
4. Submission phase → Players select and submit cards via API
5. Judging phase → Judge views submissions, selects winner
6. Score update → Game state updated, next round begins
7. Real-time updates → All changes broadcast via WebSocket

### Real-time Communication
- **WebSocket Server**: Attached to HTTP server for bidirectional communication
- **Event Broadcasting**: Room-specific message distribution
- **State Synchronization**: Game state changes pushed to all connected clients
- **Connection Management**: User mapping and room assignment tracking

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Query for state management
- **UI Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS processing
- **Development**: Vite with React plugin and TypeScript support

### Backend Dependencies
- **Server**: Express.js with TypeScript support via tsx
- **Database**: Drizzle ORM with Neon PostgreSQL adapter
- **Authentication**: Passport.js with OpenID Connect strategy
- **Real-time**: WebSocket (ws) library for live connections
- **Utilities**: Various utility libraries (clsx, date-fns, etc.)

### Authentication Integration
- **Replit OIDC**: Integration with Replit's authentication system
- **Token Management**: Automatic token refresh and validation
- **User Profile**: Automatic synchronization with Replit user data

## Deployment Strategy

### Development Environment
- **Development Server**: Vite dev server with HMR
- **API Development**: tsx for running TypeScript server directly
- **Database**: Drizzle migrations for schema management
- **Environment**: Replit-specific development tools and debugging

### Production Build
- **Frontend**: Vite production build with optimization
- **Backend**: esbuild bundling for Node.js deployment
- **Assets**: Static file serving through Express
- **Database**: Production PostgreSQL with connection pooling

### Environment Configuration
- **Database URL**: Required for PostgreSQL connection
- **Session Secret**: Required for secure session management
- **Replit Integration**: OIDC configuration for authentication
- **Development Tools**: Replit-specific plugins and error handling

## Recent Changes

### August 1, 2025 - Configurable Win Conditions and Application Fixes
- **Configurable Win Conditions**: Added game customization feature allowing players to set win condition from 3, 5, 7, 10, or 15 rounds
- **Enhanced Room Creation**: Updated room creation UI with dropdown selector for choosing rounds needed to win the game
- **Backend Integration**: Leveraged existing targetScore parameter in game engine for seamless win condition implementation
- **User Experience**: Added descriptive labels and real-time feedback showing selected win condition in room creation interface
- **Syntax Error Resolution**: Fixed unterminated string literal in server/storage.ts line 411 that was preventing app startup
- **Build Process**: Resolved esbuild Transform error that was causing the server to fail on initialization
- **Database Seeding**: Confirmed automatic card seeding works properly with 50 slight cards loaded on startup
- **Server Stability**: Application now starts successfully and runs on port 5000 without errors

### July 25, 2025 - Card Deck Management and UI Refinements
- **Complete Card Removal Logic**: Implemented session-aware card dealing for both curse and slight card decks to prevent duplicates
- **SQL Query Fixes**: Resolved all database query errors with proper Drizzle ORM syntax using not(inArray()) operators
- **UI Text Updates**: Changed "Current Slight" to "I'm the Asshole" as requested for better game theming
- **Database Performance**: Fixed array parameter handling in PostgreSQL queries for stable room joining
- **React Warning Resolution**: Fixed setState during render warning in WinningScreen component
- **Deck Exhaustion Handling**: Both card types now automatically reset their pools when all cards have been dealt

### July 24, 2025 - Game Completion and Winning Screen Implementation
- **Fixed Server-side TypeScript Errors**: Resolved all null/undefined checks in game engine for robust gameplay
- **Populated Card Database**: Added 100 curse cards and 50 slight cards with real game content from user-provided material
- **Authentication Integration**: Fixed Replit Auth integration with proper WebSocket authentication flow
- **Database Initialization**: Added automatic card seeding on server startup
- **Type Safety Improvements**: Enhanced TypeScript types across client and server components
- **Real-time WebSocket Communication**: Verified WebSocket connection and message handling for live gameplay
- **Winning Screen Modal**: Added celebration screen with fireworks, winning card display, and automatic progression
- **Audio Effects**: Implemented winning chime sound using Web Audio API with pleasant three-note sequence
- **Judge Rotation Logic**: Fixed so previous round winner becomes next judge (proper Cards Against Humanity rules)
- **Scoreboard Updates**: Fixed score display and ensured proper score tracking throughout game rounds

The application uses a monorepo structure with shared TypeScript schemas between frontend and backend, ensuring type safety across the entire stack. The real-time game engine provides smooth multiplayer experiences while the authentication system seamlessly integrates with Replit's user management.