"use server"

import { db, pool } from "@/lib/db"
import { ensureSchema } from "@/lib/db/ensure"
import { players, kills, snapshots } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  checkPassword,
  createSession,
  destroySession,
  isAuthenticated,
} from "@/lib/auth"

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

  await captureSnapshot(`Add player "${name}"`)
  await db.insert(players).values({ name, targetId, location, item })
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

  await captureSnapshot(`Edit player "${name}"`)
  await db
    .update(players)
    .set({
      name,
      targetId,
      location,
      item,
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
  const killerId = Number(formData.get("killerId"))
  const victimId = Number(formData.get("victimId"))
  const item = String(formData.get("item") ?? "").trim() || null
  const location = String(formData.get("location") ?? "").trim() || null
  const activity = String(formData.get("activity") ?? "").trim() || null
  const witness = String(formData.get("witness") ?? "").trim() || null

  if (!killerId || !victimId || killerId === victimId) return

  await ensureSchema()
  const [victim] = await db.select().from(players).where(eq(players.id, victimId))
  if (!victim) return

  await captureSnapshot("Record kill")

  // Log the kill.
  await db.insert(kills).values({
    killerId,
    victimId,
    item,
    location,
    activity,
    witness,
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

  await captureSnapshot(`Edit kill #${id}`)
  await db
    .update(kills)
    .set({ item, location, activity, witness })
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
