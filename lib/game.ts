import { db } from "@/lib/db"
import { ensureSchema } from "@/lib/db/ensure"
import { players, kills, snapshots, settings } from "@/lib/db/schema"
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
  notes: string | null
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
    notes: k.notes,
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

// ---------- Setup pools (locations & weapons) ----------

export type Pools = { locations: string[]; weapons: string[] }

export async function getPools(): Promise<Pools> {
  await ensureSchema()
  const rows = await db.select().from(settings)
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  return {
    locations: asList(byKey.get("locations")),
    weapons: asList(byKey.get("weapons")),
  }
}

// ---------- Live kill chain (for the visualizer) ----------

export type ChainLink = {
  id: number
  name: string
  gender: string | null
  targetId: number | null
  targetName: string | null
  location: string | null
  item: string | null
}

export type EliminatedInfo = { id: number; name: string; killedByName: string | null }

export type ChainView = {
  links: ChainLink[]
  eliminated: EliminatedInfo[]
  /** True when the surviving players don't form one clean closed loop. */
  broken: boolean
}

export async function getChain(): Promise<ChainView> {
  await ensureSchema()
  const [allPlayers, allKills] = await Promise.all([
    db.select().from(players),
    db.select().from(kills),
  ])

  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))
  const alive = allPlayers.filter((p) => p.alive)
  const aliveById = new Map(alive.map((p) => [p.id, p]))

  // Walk the cycle. Start from a survivor nobody else is hunting (a "head" only
  // exists when the loop is broken); otherwise any survivor works.
  const start =
    alive.find((p) => !alive.some((q) => q.targetId === p.id)) ?? alive[0]

  const links: ChainLink[] = []
  const visited = new Set<number>()
  let cur = start
  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id)
    const target = cur.targetId != null ? aliveById.get(cur.targetId) : undefined
    links.push({
      id: cur.id,
      name: cur.name,
      gender: cur.gender,
      targetId: cur.targetId,
      targetName: target?.name ?? (cur.targetId != null ? nameById.get(cur.targetId) ?? null : null),
      location: cur.location,
      item: cur.item,
    })
    cur = target as (typeof alive)[number] | undefined
  }

  const lastTarget = links[links.length - 1]?.targetId
  const broken = links.length !== alive.length || (alive.length > 1 && lastTarget !== start?.id)

  // Most recent killer for each eliminated player.
  const killerByVictim = new Map<number, number>()
  for (const k of allKills) killerByVictim.set(k.victimId, k.killerId)
  const eliminated: EliminatedInfo[] = allPlayers
    .filter((p) => !p.alive)
    .map((p) => {
      const killerId = killerByVictim.get(p.id)
      return { id: p.id, name: p.name, killedByName: killerId != null ? nameById.get(killerId) ?? null : null }
    })

  return { links, eliminated, broken }
}
