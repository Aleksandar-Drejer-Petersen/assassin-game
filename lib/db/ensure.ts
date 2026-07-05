import { pool } from "@/lib/db"

// Creates the tables the app needs the first time it runs against a fresh
// database. It's safe to call on every request: the CREATE statements use
// IF NOT EXISTS, and we memoize so the work only happens once per server boot.
let ready: Promise<void> | null = null

const DDL = `
CREATE TABLE IF NOT EXISTS players (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  alive         boolean NOT NULL DEFAULT true,
  target_id     integer,
  location      text,
  item          text,
  eliminated_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kills (
  id          serial PRIMARY KEY,
  killer_id   integer NOT NULL,
  victim_id   integer NOT NULL,
  item        text,
  location    text,
  activity    text,
  witness     text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id         serial PRIMARY KEY,
  label      text NOT NULL,
  state      jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`

export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = pool.query(DDL).then(() => undefined).catch((err) => {
      // Reset so a transient failure (e.g. cold database) can be retried
      // on the next request instead of caching the rejection forever.
      ready = null
      throw err
    })
  }
  return ready
}
