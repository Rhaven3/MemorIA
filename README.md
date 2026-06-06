# MemorIA

MemorIA is a voice-assisted web application designed to help seniors maintain social connections and reduce isolation. The system uses a conversational AI interface to understand the needs of elderly users and recommend personalized local activities based on their profile, mobility level, and interests.

## Overview

The application provides two distinct interfaces: a senior-facing companion view designed for accessibility and ease of use, and an administrative view for caregivers or family members to manage the senior's profile and monitor participation history.

The core interaction flow is as follows: the senior speaks naturally into the microphone, the speech is transcribed via the Web Speech API, the transcript is sent to the backend along with the user's profile, Gemini selects the most appropriate activities from the database, and the assistant responds both visually and vocally with personalized suggestions.

## Architecture

**Frontend** — Single HTML file (`memoai.html`) using Vanilla JavaScript and Tailwind CSS. No framework required.

**Backend** — Node.js with Express. Handles all API calls, authentication, and data persistence.

**Database** — Supabase (PostgreSQL) for storing profiles, events, and participation history.

**AI** — Google Gemini API for activity recommendation. Mistral Voxtral API for text-to-speech synthesis.

**Voice input** — Web Speech API (browser-native, no API key required).

## Prerequisites

- Node.js 18 or higher
- A Supabase account and project
- A Gemini API key (Google AI Studio)
- A Mistral API key (for voice synthesis)

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Rhaven3/MemorIA.git
cd MemorIA
npm install
```

Create a `.env` file at the root of the project:

```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
MISTRAL_API_KEY=your_mistral_api_key
USER_TOKEN=user123
ADMIN_TOKEN=admin456
PORT=3000
```

## Database Setup

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
create table profiles (
  id text primary key,
  prenom text,
  age int,
  mobilite text,
  interets text,
  sujets_eviter text,
  ville text,
  photo_url text
);

create table events (
  id text primary key,
  titre text,
  description text,
  lieu text,
  heure text,
  emoji text,
  mobilite_requise text
);

create table participations (
  id serial primary key,
  user_id text,
  event_id text,
  created_at timestamp default now()
);

create table messages (
  id serial primary key,
  user_id text,
  expediteur_nom text,
  expediteur_photo text,
  contenu text,
  type text,
  lu boolean default false,
  created_at timestamp default now()
);
```

## Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /suggest | Receives a voice transcript and returns AI-generated activity suggestions |
| POST | /participate | Registers a user for an event |
| GET | /events | Returns all available events |
| GET | /profile/:userId | Returns the profile for a given user |
| POST | /profile/:userId | Creates or updates a user profile |
| GET | /participations/:userId | Returns the participation history for a user |
| GET | /messages/:userId | Returns messages sent to a user |
| POST | /messages | Creates a new message |
| POST | /speak | Generates speech audio using Mistral Voxtral |

## Authentication

All API requests require an `Authorization` header. Two static tokens are supported:

- `user123` — grants access to the senior interface
- `admin456` — grants access to the administrative interface

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Web framework | Express |
| Frontend | Vanilla JavaScript, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| AI recommendation | Google Gemini |
| Voice synthesis | Mistral Voxtral |
| Voice input | Web Speech API |
| Build tool | Vite + TypeScript |

## Project Structure

```
memoria/
  server.ts          Backend entry point
  memoai.html        Frontend single-page application
  .env               Environment variables (not committed)
  package.json       Dependencies and scripts
```

## Notes

- The `.env` file is excluded from version control. Never commit API keys.
- The `lucas.mp3` audio file is excluded from version control.
- For production deployment, the application can be hosted on Railway or Render using the `npm run build && npm start` commands.

## License

This project was developed as part of an academic prototype. All rights reserved.
