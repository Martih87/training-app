# Training App

Personal training session tracker built with Express and SQLite (`better-sqlite3`). Log workouts with exercises, sets, weights, and reps — then review them in the browser. Supports multiple user profiles.

## Tech Stack

- **Runtime:** Node.js / TypeScript
- **Server:** Express 5
- **Database:** SQLite via `better-sqlite3` (WAL mode)
- **Auth:** Google Sign-In (Identity Services)
- **Frontend:** Vanilla HTML / CSS / JS

## Prerequisites

- Node.js ≥ 18
- npm
- A **Google Cloud OAuth 2.0 Client ID** (see below)

## Google Sign-In Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Set the application type to **Web application**
6. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (for local dev)
   - Your production URL if applicable
7. Copy the **Client ID**

Set the Client ID as an environment variable:

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
```

Or pass it inline when starting the server:

```bash
GOOGLE_CLIENT_ID="your-client-id" npm run dev
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Build the server and client TypeScript
npm run build

# 3. Start the server
npm start
```

The app will be available at **http://localhost:3000**.

### Development Mode

```bash
npm run dev
```

Runs the server directly with `ts-node` — no build step needed.

## Setting Up the SQLite Database

The database is created **automatically** the first time the server starts. No manual setup required — `better-sqlite3` will create the file at `data/training.db` and the schema (tables + indexes) is applied on boot.

If you want to start fresh or re-create the database:

```bash
# Remove the existing database
rm -f data/training.db

# Start the server (or run the seed) — a new DB is created automatically
npm start
```

### Seeding Sample Data

To populate the database with realistic sample workouts (6 sessions/week from Jan 1 2026 to today):

```bash
npm run seed
```

This generates sessions for the **Martin** profile with the four core exercises (Benchpress, Bicep Curls, Lateral Raises, Ab Crunches) plus 1–3 random optional exercises per session, with slight weight variation for realism.

## Project Structure

```
├── data/
│   └── training.db         # SQLite database (auto-created)
├── public/                  # Static frontend files
│   ├── index.html           # Landing page (Google Sign-In)
│   ├── log.html             # Session logging UI
│   ├── admin.html           # Training history / stats
│   ├── style.css
│   ├── admin.css
│   ├── app.ts / app.js      # Client-side logic (log page)
│   └── admin.ts / admin.js  # Client-side logic (history page)
├── src/
│   ├── db.ts                # Database setup, schema & queries
│   ├── seed.ts              # Seed script for sample data
│   └── server.ts            # Express server & API routes
├── package.json
└── tsconfig.json
```

## API Endpoints

### Auth

| Method | Path                | Description                        |
| ------ | ------------------- | ---------------------------------- |
| `GET`  | `/api/auth/config`  | Get Google Client ID for frontend  |
| `POST` | `/api/auth/google`  | Exchange Google credential for session |
| `GET`  | `/api/auth/me`      | Get the signed-in user's profile   |
| `POST` | `/api/auth/signout` | Clear session cookie               |

### Exercises

| Method | Path             | Description           |
| ------ | ---------------- | --------------------- |
| `GET`  | `/api/exercises` | List exercise presets  |

### Sessions (auth-protected, scoped to signed-in user)

| Method   | Path                | Description              |
| -------- | ------------------- | ------------------------ |
| `GET`    | `/api/sessions`     | List sessions (desc)     |
| `GET`    | `/api/sessions/:id` | Get a single session     |
| `POST`   | `/api/sessions`     | Create a new session     |
| `DELETE` | `/api/sessions/:id` | Delete a session         |

## NPM Scripts

| Script         | Description                                |
| -------------- | ------------------------------------------ |
| `build`        | Compile server + client TypeScript         |
| `build:server` | Compile server TypeScript only             |
| `build:client` | Compile client TypeScript only             |
| `start`        | Run the compiled server (`dist/server.js`) |
| `dev`          | Run the server with `ts-node`              |
| `seed`         | Populate the DB with sample workouts       |

## License

ISC
