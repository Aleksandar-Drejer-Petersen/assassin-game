import { db } from "@/lib/db"
import { ensureSchema } from "@/lib/db/ensure"
import { players, kills, snapshots } from "@/lib/db/schema"
import { desc } from "drizzle-orm"

export type PlayerRow = typeof players.$inferSelect

export type KillFeedItem = {
  id: number
  killerId: number
  killerName: string
  victimId: number
  victimName: string
  item: string | null
  location: string | null
  activity: string | null
  witness: string | null
  occurredAt: Date
}

export type ScoreRow = {
  id: number
  name: string
  alive: boolean
  kills: number
  eliminatedAt: Date | null
}

export async function getPlayers(): Promise<PlayerRow[]> {
  await ensureSchema()
  return db.select().from(players).orderBy(players.name)
}

export async function getKillFeed(): Promise<KillFeedItem[]> {
  await ensureSchema()
  const [allKills, allPlayers] = await Promise.all([
    db.select().from(kills).orderBy(desc(kills.occurredAt)),
    db.select().from(players),
  ])
  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))
  return allKills.map((k) => ({
    id: k.id,
    killerId: k.killerId,
    killerName: nameById.get(k.killerId) ?? "Unknown",
    victimId: k.victimId,
    victimName: nameById.get(k.victimId) ?? "Unknown",
    item: k.item,
    location: k.location,
    activity: k.activity,
    witness: k.witness,
    occurredAt: k.occurredAt,
  }))
}

export async function getScoreboard(): Promise<ScoreRow[]> {
  await ensureSchema()
  const [allKills, allPlayers] = await Promise.all([
    db.select().from(kills),
    db.select().from(players),
  ])
  const killCount = new Map<number, number>()
  for (const k of allKills) {
    killCount.set(k.killerId, (killCount.get(k.killerId) ?? 0) + 1)
  }
  const rows: ScoreRow[] = allPlayers.map((p) => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    kills: killCount.get(p.id) ?? 0,
    eliminatedAt: p.eliminatedAt,
  }))
  // Rank: most kills first, then alive players ahead of eliminated ones.
  rows.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills
    if (a.alive !== b.alive) return a.alive ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return rows
}

export async function getStats() {
  const scoreboard = await getScoreboard()
  const alive = scoreboard.filter((r) => r.alive)
  const totalKills = scoreboard.reduce((sum, r) => sum + r.kills, 0)
  const topKiller = [...scoreboard].sort((a, b) => b.kills - a.kills)[0] ?? null
  return {
    totalPlayers: scoreboard.length,
    aliveCount: alive.length,
    eliminatedCount: scoreboard.length - alive.length,
    totalKills,
    topKiller: topKiller && topKiller.kills > 0 ? topKiller : null,
    lastStanding: alive.length === 1 ? alive[0] : null,
  }
}

export async function getSnapshots() {
  await ensureSchema()
  return db.select().from(snapshots).orderBy(desc(snapshots.createdAt))
}
