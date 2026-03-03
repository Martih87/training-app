# Training App

Personal training session tracker built with Express and SQLite (`better-sqlite3`). Log workouts with exercises, sets, weights, and reps — then review them in the browser. Supports multiple user profiles.

## Tech Stack

- **Runtime:** Node.js / TypeScript
- **Server:** Express 5
- **Database:** SQLite via `better-sqlite3` (WAL mode)
- **Frontend:** Vanilla HTML / CSS / JS

## Prerequisites

- Node.js ≥ 18
- npm

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
│   ├── index.html           # Landing page (profile selector)
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

### Profiles

| Method | Path                 | Description           |
| ------ | -------------------- | --------------------- |
| `GET`  | `/api/profiles`      | List all profiles     |
| `GET`  | `/api/profiles/:id`  | Get a single profile  |
| `POST` | `/api/profiles`      | Create a new profile  |

### Exercises

| Method | Path             | Description           |
| ------ | ---------------- | --------------------- |
| `GET`  | `/api/exercises` | List exercise presets  |

### Sessions (scoped to profile)

| Method   | Path                                    | Description              |
| -------- | --------------------------------------- | ------------------------ |
| `GET`    | `/api/profiles/:profileId/sessions`     | List sessions (desc)     |
| `GET`    | `/api/profiles/:profileId/sessions/:id` | Get a single session     |
| `POST`   | `/api/profiles/:profileId/sessions`     | Create a new session     |
| `DELETE` | `/api/profiles/:profileId/sessions/:id` | Delete a session         |

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
