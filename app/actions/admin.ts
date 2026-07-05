"use server"

import { db, pool } from "@/lib/db"
import { ensureSchema } from "@/lib/db/ensure"
import { players, kills, snapshots, settings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  checkPassword,
  createSession,
  destroySession,
  isAuthenticated,
} from "@/lib/auth"
import { buildOrder, distribute, normalizeGender, type ChainPerson } from "@/lib/chain"

async function requireAdmin() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }
}

/** Capture the full current game state so any change can be reverted later. */
async function captureSnapshot(label: string) {
  await ensureSchema()
  const [allPlayers, allKills] = await Promise.all([
    db.select().from(players),
    db.select().from(kills),
  ])
  await db.insert(snapshots).values({
    label,
    state: { players: allPlayers, kills: allKills },
  })
}

// ---------- Auth ----------

export async function login(_prev: unknown, formData: FormData) {
  const password = String(formData.get("password") ?? "")
  if (!checkPassword(password)) {
    return { error: "Incorrect password." }
  }
  await createSession()
  redirect("/admin")
}

export async function logout() {
  await destroySession()
  redirect("/admin")
}

// ---------- Players ----------

export async function addPlayer(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  const targetRaw = String(formData.get("targetId") ?? "")
  const targetId = targetRaw ? Number(targetRaw) : null
  const location = String(formData.get("location") ?? "").trim() || null
  const item = String(formData.get("item") ?? "").trim() || null
  const gender = normalizeGender(String(formData.get("gender") ?? ""))

  await captureSnapshot(`Add player "${name}"`)
  await db.insert(players).values({ name, targetId, location, item, gender })
  revalidatePath("/admin")
  revalidatePath("/")
}

/** Add many players at once from a pasted list ("Name" or "Name, M/F" per line). */
export async function bulkAddPlayers(formData: FormData) {
  await requireAdmin()
  await ensureSchema()
  const raw = String(formData.get("names") ?? "")
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return

  const existing = await db.select().from(players)
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()))

  const toInsert: { name: string; gender: string | null }[] = []
  for (const line of lines) {
    // Split on comma / tab / semicolon: "Alex, F" or "Alex	boy"
    const parts = line.split(/[,;\t]/).map((s) => s.trim())
    const name = parts[0]
    if (!name) continue
    const gender = normalizeGender(parts[1] ?? "")
    const key = name.toLowerCase()
    if (existingNames.has(key)) {
      // Update gender on an existing player if the paste specifies one.
      if (gender) await db.update(players).set({ gender }).where(eq(players.name, name))
      continue
    }
    existingNames.add(key)
    toInsert.push({ name, gender })
  }

  if (toInsert.length > 0) {
    await captureSnapshot(`Add ${toInsert.length} players`)
    await db.insert(players).values(toInsert)
  }
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function updatePlayer(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  const name = String(formData.get("name") ?? "").trim()
  const targetRaw = String(formData.get("targetId") ?? "")
  const targetId = targetRaw ? Number(targetRaw) : null
  const location = String(formData.get("location") ?? "").trim() || null
  const item = String(formData.get("item") ?? "").trim() || null
  const alive = String(formData.get("alive") ?? "true") === "true"
  const gender = normalizeGender(String(formData.get("gender") ?? ""))

  await captureSnapshot(`Edit player "${name}"`)
  await db
    .update(players)
    .set({
      name,
      targetId,
      location,
      item,
      gender,
      alive,
      eliminatedAt: alive ? null : new Date(),
    })
    .where(eq(players.id, id))
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deletePlayer(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  await captureSnapshot(`Delete player #${id}`)
  await db.delete(players).where(eq(players.id, id))
  revalidatePath("/admin")
  revalidatePath("/")
}

// ---------- Kills ----------

export async function recordKill(formData: FormData) {
  await requireAdmin()
  await ensureSchema()
  const killerId = Number(formData.get("killerId"))
  const witness = String(formData.get("witness") ?? "").trim() || null
  const notes = String(formData.get("notes") ?? "").trim() || null
  if (!killerId) return

  // The kill is fully determined by the killer's current mission: their target
  // is the victim, and the weapon/location they were assigned is what was used.
  const [killer] = await db.select().from(players).where(eq(players.id, killerId))
  if (!killer || !killer.alive) return
  const victimId = killer.targetId
  if (!victimId || victimId === killerId) return // killer has no live target

  const [victim] = await db.select().from(players).where(eq(players.id, victimId))
  if (!victim) return

  const item = killer.item
  const location = killer.location

  await captureSnapshot("Record kill")

  // Log the kill using the mission the killer was carrying.
  await db.insert(kills).values({
    killerId,
    victimId,
    item,
    location,
    witness,
    notes,
  })

  // Victim is eliminated.
  await db
    .update(players)
    .set({ alive: false, eliminatedAt: new Date() })
    .where(eq(players.id, victimId))

  // Killer inherits the victim's mission (their target, place, and item),
  // unless the victim was hunting the killer (chain closes on itself).
  const inheritedTarget = victim.targetId === killerId ? null : victim.targetId
  await db
    .update(players)
    .set({
      targetId: inheritedTarget,
      location: victim.location,
      item: victim.item,
    })
    .where(eq(players.id, killerId))

  revalidatePath("/admin")
  revalidatePath("/")
}

export async function updateKill(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  const item = String(formData.get("item") ?? "").trim() || null
  const location = String(formData.get("location") ?? "").trim() || null
  const activity = String(formData.get("activity") ?? "").trim() || null
  const witness = String(formData.get("witness") ?? "").trim() || null
  const notes = String(formData.get("notes") ?? "").trim() || null

  await captureSnapshot(`Edit kill #${id}`)
  await db
    .update(kills)
    .set({ item, location, activity, witness, notes })
    .where(eq(kills.id, id))
  revalidatePath("/admin")
  revalidatePath("/")
}

export async function deleteKill(formData: FormData) {
  await requireAdmin()
  const id = Number(formData.get("id"))
  await captureSnapshot(`Delete kill #${id}`)
  await db.delete(kills).where(eq(kills.id, id))
  revalidatePath("/admin")
  revalidatePath("/")
}

// ---------- Version history ----------

type SnapshotState = {
  players: (typeof players.$inferSelect)[]
  kills: (typeof kills.$inferSelect)[]
}

export async function rollbackTo(formData: FormData) {
  await requireAdmin()
  await ensureSchema()
  const id = Number(formData.get("id"))
  const [snap] = await db.select().from(snapshots).where(eq(snapshots.id, id))
  if (!snap) return

  // Save the current state first so a rollback itself can be undone.
  await captureSnapshot(`Before rollback to #${id}`)

  const state = snap.state as SnapshotState
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM kills")
    await client.query("DELETE FROM players")

    for (const p of state.players) {
      await client.query(
        `INSERT INTO players (id, name, alive, target_id, location, item, eliminated_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [p.id, p.name, p.alive, p.targetId, p.location, p.item, p.eliminatedAt, p.createdAt],
      )
    }
    for (const k of state.kills) {
      await client.query(
        `INSERT INTO kills (id, killer_id, victim_id, item, location, activity, witness, occurred_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [k.id, k.killerId, k.victimId, k.item, k.location, k.activity, k.witness, k.occurredAt, k.createdAt],
      )
    }
    // Keep the auto-increment sequences ahead of the restored ids.
    await client.query(
      `SELECT setval(pg_get_serial_sequence('players','id'), COALESCE((SELECT MAX(id) FROM players), 1))`,
    )
    await client.query(
      `SELECT setval(pg_get_serial_sequence('kills','id'), COALESCE((SELECT MAX(id) FROM kills), 1))`,
    )
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }

  revalidatePath("/admin")
  revalidatePath("/")
}

// ---------- Setup: pools & chain assignment ----------

/** Parse a textarea into a trimmed, de-duplicated list of lines. */
function parseList(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of raw.split("\n")) {
    const v = line.trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

/**
 * Wire the players into one cycle in the given order (orderedIds[i] hunts
 * orderedIds[i+1], last hunts first), assigning each a location + weapon, and
 * reset the game (clear kills, everyone alive). Atomic.
 */
async function writeChain(orderedIds: number[], locations: string[], weapons: string[]) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM kills")
    for (let i = 0; i < orderedIds.length; i++) {
      const targetId = orderedIds[(i + 1) % orderedIds.length]
      await client.query(
        `UPDATE players
           SET target_id = $1, location = $2, item = $3, alive = true, eliminated_at = NULL
         WHERE id = $4`,
        [targetId, locations[i], weapons[i], orderedIds[i]],
      )
    }
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

async function upsertSetting(key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
}

/** Save the pools of locations and weapons the chain draws from. */
export async function savePools(formData: FormData) {
  await requireAdmin()
  await ensureSchema()
  const locations = parseList(String(formData.get("locations") ?? ""))
  const weapons = parseList(String(formData.get("weapons") ?? ""))
  await upsertSetting("locations", locations)
  await upsertSetting("weapons", weapons)
  revalidatePath("/admin")
  return { ok: true as const, locations: locations.length, weapons: weapons.length }
}

export type AssignResult =
  | { ok: true; warning: string | null }
  | { ok: false; error: string }

/**
 * Auto-assign a location + weapon to every player and wire them into ONE
 * continuous circle. Optionally alternate genders around the loop. Resets the
 * game (clears the kill log, everyone back to alive); a snapshot is taken first
 * so it can be undone from History.
 */
export async function assignChain(formData: FormData): Promise<AssignResult> {
  await requireAdmin()
  await ensureSchema()

  const alternate =
    String(formData.get("alternate") ?? "") === "true" ||
    String(formData.get("alternate") ?? "") === "on"

  const [roster, locRow, wpnRow] = await Promise.all([
    db.select().from(players),
    db.select().from(settings).where(eq(settings.key, "locations")),
    db.select().from(settings).where(eq(settings.key, "weapons")),
  ])

  const locations = Array.isArray(locRow[0]?.value)
    ? (locRow[0]!.value as unknown[]).filter((x): x is string => typeof x === "string")
    : []
  const weapons = Array.isArray(wpnRow[0]?.value)
    ? (wpnRow[0]!.value as unknown[]).filter((x): x is string => typeof x === "string")
    : []

  const n = roster.length
  if (n < 2) {
    return { ok: false, error: "Add at least 2 players before building the chain." }
  }
  if (locations.length === 0 || weapons.length === 0) {
    return {
      ok: false,
      error: "Add at least one location/situation and one weapon before building the chain.",
    }
  }

  const people: ChainPerson[] = roster.map((p) => ({ id: p.id, name: p.name, gender: p.gender }))
  const { order, genderWarning } = buildOrder(people, alternate)
  // Spread locations & weapons evenly, duplicating as needed when the pool is
  // smaller than the roster (never a random over-used subset).
  const pickedLocations = distribute(locations, n)
  const pickedWeapons = distribute(weapons, n)

  await captureSnapshot("Build kill chain")
  await writeChain(order.map((p) => p.id), pickedLocations, pickedWeapons)

  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true, warning: genderWarning }
}

/**
 * Build the chain from an explicit, admin-chosen order (the drag-and-drop
 * custom chain). `order` is a comma-separated list of player ids that must
 * include every player exactly once. Locations & weapons are still spread
 * evenly. Resets the game; snapshot taken first so it can be undone.
 */
export async function assignCustomChain(formData: FormData): Promise<AssignResult> {
  await requireAdmin()
  await ensureSchema()

  const ids = String(formData.get("order") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((x) => Number.isInteger(x) && x > 0)

  const [roster, locRow, wpnRow] = await Promise.all([
    db.select().from(players),
    db.select().from(settings).where(eq(settings.key, "locations")),
    db.select().from(settings).where(eq(settings.key, "weapons")),
  ])

  const locations = Array.isArray(locRow[0]?.value)
    ? (locRow[0]!.value as unknown[]).filter((x): x is string => typeof x === "string")
    : []
  const weapons = Array.isArray(wpnRow[0]?.value)
    ? (wpnRow[0]!.value as unknown[]).filter((x): x is string => typeof x === "string")
    : []

  const n = ids.length
  if (n < 2) return { ok: false, error: "Put at least 2 players in the order." }
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "A player appears twice in the order." }
  }
  const rosterIds = new Set(roster.map((p) => p.id))
  if (n !== roster.length || !ids.every((id) => rosterIds.has(id))) {
    return { ok: false, error: "The custom order must include every player exactly once." }
  }
  if (locations.length === 0 || weapons.length === 0) {
    return {
      ok: false,
      error: "Add at least one location/situation and one weapon before building the chain.",
    }
  }

  await captureSnapshot("Build custom kill chain")
  await writeChain(ids, distribute(locations, n), distribute(weapons, n))

  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true, warning: null }
}
