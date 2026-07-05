import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core"

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  alive: boolean("alive").notNull().default(true),
  // The player this person is currently hunting (their inherited mission)
  targetId: integer("target_id"),
  location: text("location"),
  item: text("item"),
  eliminatedAt: timestamp("eliminated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const kills = pgTable("kills", {
  id: serial("id").primaryKey(),
  killerId: integer("killer_id").notNull(),
  victimId: integer("victim_id").notNull(),
  item: text("item"),
  location: text("location"),
  activity: text("activity"),
  witness: text("witness"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Full-state snapshots captured before every mutation so the admin can
// review history and roll back to any previous version.
export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Player = typeof players.$inferSelect
export type Kill = typeof kills.$inferSelect
export type Snapshot = typeof snapshots.$inferSelect
