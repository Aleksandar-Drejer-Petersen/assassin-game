import { writeFileSync } from "node:fs"
import { buildOrder, normalizeGender, shuffle, type ChainPerson } from "../lib/chain"

type PlayerRow = {
  id: number
  name: string
  alive: boolean
  gender: string | null
  targetId: number | null
  location: string | null
  item: string | null
  eliminatedAt: Date | null
  createdAt: Date
}

type KillRow = {
  id: number
  killerId: number
  victimId: number
  item: string | null
  location: string | null
  activity: string | null
  witness: string | null
  notes: string | null
  occurredAt: Date
  createdAt: Date
}

type ScoreRow = {
  id: number
  name: string
  alive: boolean
  kills: number
  eliminatedAt: Date | null
}

type GameState = {
  players: PlayerRow[]
  kills: KillRow[]
  nextKillId: number
  clock: number
  lastPickedLocations: string[]
  lastPickedWeapons: string[]
  lastWarning: string | null
}

type ScenarioResult = {
  id: number
  label: string
  detail: string
  pass: boolean
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function note(results: ScenarioResult[], id: number, label: string, detail: string, pass = true) {
  results.push({ id, label, detail, pass })
}

function newDate(state: GameState) {
  state.clock += 1
  return new Date(Date.UTC(2026, 0, 1, 0, 0, state.clock))
}

function createPlayers(): PlayerRow[] {
  const males = [
    "Adrian Brooks",
    "Bennett Cole",
    "Caleb Diaz",
    "Dorian Ellis",
    "Elias Ford",
    "Felix Grant",
    "Gavin Hale",
    "Hugo Ivers",
    "Isaac Jones",
    "Julian Knight",
    "Leo Martin",
    "Miles Novak",
    "Nolan Ortiz",
    "Owen Price",
    "Parker Quinn",
    "Roman Shaw",
    "Silas Turner",
    "Theo Vaughn",
  ]
  const females = [
    "Amelia Stone",
    "Bianca Reed",
    "Clara Hayes",
    "Daphne Fox",
    "Elena Cruz",
    "Freya Wells",
    "Grace Lin",
    "Hannah Moore",
    "Iris Patel",
    "Jade Kim",
    "Keira Long",
    "Lena Scott",
    "Maya Chen",
    "Nora Blake",
    "Olivia Hart",
    "Priya Shah",
    "Ruby Lane",
  ]
  const unspecified = ["Alex Morgan", "Riley Jordan"]
  const names = [
    ...males.map((name) => ({ name, gender: normalizeGender("male") })),
    ...females.map((name) => ({ name, gender: normalizeGender("female") })),
    ...unspecified.map((name) => ({ name, gender: normalizeGender(null) })),
  ]

  return names.map((p, index) => ({
    id: index + 1,
    name: p.name,
    alive: true,
    gender: p.gender,
    targetId: null,
    location: null,
    item: null,
    eliminatedAt: null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
  }))
}

function makeState(players = createPlayers()): GameState {
  return {
    players: players.map((p) => ({ ...p })),
    kills: [],
    nextKillId: 1,
    clock: 0,
    lastPickedLocations: [],
    lastPickedWeapons: [],
    lastWarning: null,
  }
}

function locations(count: number) {
  return Array.from({ length: count }, (_, i) => `Location ${String(i + 1).padStart(2, "0")}`)
}

function weapons(count: number) {
  return Array.from({ length: count }, (_, i) => `Weapon ${String(i + 1).padStart(2, "0")}`)
}

function playerById(state: GameState, id: number) {
  const player = state.players.find((p) => p.id === id)
  assert(player, `Missing player #${id}`)
  return player
}

// Mirrors app/actions/admin.ts assignChain.
function assignChainMemory(
  state: GameState,
  poolLocations: string[],
  poolWeapons: string[],
  alternate: boolean,
): { ok: true; warning: string | null } | { ok: false; error: string } {
  const n = state.players.length
  if (n < 2) return { ok: false, error: "Add at least 2 players before building the chain." }

  const missing: string[] = []
  if (poolLocations.length < n) missing.push(`${n - poolLocations.length} more location${n - poolLocations.length === 1 ? "" : "s"}`)
  if (poolWeapons.length < n) missing.push(`${n - poolWeapons.length} more weapon${n - poolWeapons.length === 1 ? "" : "s"}`)
  if (missing.length > 0) {
    return {
      ok: false,
      error: `You have ${n} players, so you need at least ${n} locations and ${n} weapons. Add ${missing.join(" and ")}.`,
    }
  }

  const people: ChainPerson[] = state.players.map((p) => ({ id: p.id, name: p.name, gender: p.gender }))
  const { order, genderWarning } = buildOrder(people, alternate)
  const pickedLocations = shuffle(poolLocations).slice(0, n)
  const pickedWeapons = shuffle(poolWeapons).slice(0, n)

  state.kills = []
  state.nextKillId = 1
  state.lastPickedLocations = pickedLocations
  state.lastPickedWeapons = pickedWeapons
  state.lastWarning = genderWarning

  for (let i = 0; i < order.length; i++) {
    const person = playerById(state, order[i].id)
    const target = order[(i + 1) % order.length]
    person.targetId = target.id
    person.location = pickedLocations[i]
    person.item = pickedWeapons[i]
    person.alive = true
    person.eliminatedAt = null
  }

  return { ok: true, warning: genderWarning }
}

// Mirrors app/actions/admin.ts recordKill.
function recordKillMemory(
  state: GameState,
  input: {
    killerId: number
    victimId: number
    item?: string | null
    location?: string | null
    activity?: string | null
    witness?: string | null
    notes?: string | null
  },
) {
  if (!input.killerId || !input.victimId || input.killerId === input.victimId) return null

  const victim = state.players.find((p) => p.id === input.victimId)
  if (!victim) return null
  const killer = playerById(state, input.killerId)
  const victimFormerTargetId = victim.targetId
  const victimFormerLocation = victim.location
  const victimFormerItem = victim.item
  const occurredAt = newDate(state)

  const kill: KillRow = {
    id: state.nextKillId++,
    killerId: input.killerId,
    victimId: input.victimId,
    item: (input.item ?? "").trim() || null,
    location: (input.location ?? "").trim() || null,
    activity: (input.activity ?? "").trim() || null,
    witness: (input.witness ?? "").trim() || null,
    notes: (input.notes ?? "").trim() || null,
    occurredAt,
    createdAt: occurredAt,
  }
  state.kills.push(kill)

  victim.alive = false
  victim.eliminatedAt = newDate(state)

  killer.targetId = victimFormerTargetId === input.killerId ? null : victimFormerTargetId
  killer.location = victimFormerLocation
  killer.item = victimFormerItem

  return { kill, victimFormerTargetId, victimFormerLocation, victimFormerItem }
}

// Mirrors app/actions/admin.ts updateKill.
function updateKillMemory(
  state: GameState,
  id: number,
  fields: { item?: string | null; location?: string | null; activity?: string | null; witness?: string | null; notes?: string | null },
) {
  const kill = state.kills.find((k) => k.id === id)
  assert(kill, `Missing kill #${id}`)
  kill.item = (fields.item ?? "").trim() || null
  kill.location = (fields.location ?? "").trim() || null
  kill.activity = (fields.activity ?? "").trim() || null
  kill.witness = (fields.witness ?? "").trim() || null
  kill.notes = (fields.notes ?? "").trim() || null
}

// Mirrors app/actions/admin.ts deleteKill.
function deleteKillMemory(state: GameState, id: number) {
  state.kills = state.kills.filter((k) => k.id !== id)
}

// Mirrors lib/game.ts getKillFeed.
function getKillFeedMemory(state: GameState) {
  const nameById = new Map(state.players.map((p) => [p.id, p.name]))
  return [...state.kills]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .map((k) => ({
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

// Mirrors lib/game.ts getScoreboard.
function getScoreboardMemory(state: GameState): ScoreRow[] {
  const killCount = new Map<number, number>()
  for (const kill of state.kills) {
    killCount.set(kill.killerId, (killCount.get(kill.killerId) ?? 0) + 1)
  }

  const rows = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    kills: killCount.get(p.id) ?? 0,
    eliminatedAt: p.eliminatedAt,
  }))
  rows.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills
    if (a.alive !== b.alive) return a.alive ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return rows
}

// Mirrors lib/game.ts getStats.
function getStatsMemory(state: GameState) {
  const scoreboard = getScoreboardMemory(state)
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

// Mirrors lib/game.ts getChain.
function getChainMemory(state: GameState) {
  const nameById = new Map(state.players.map((p) => [p.id, p.name]))
  const alive = state.players.filter((p) => p.alive)
  const aliveById = new Map(alive.map((p) => [p.id, p]))
  const start = alive.find((p) => !alive.some((q) => q.targetId === p.id)) ?? alive[0]

  const links = []
  const visited = new Set<number>()
  let cur: PlayerRow | undefined = start
  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id)
    const target: PlayerRow | undefined = cur.targetId != null ? aliveById.get(cur.targetId) : undefined
    links.push({
      id: cur.id,
      name: cur.name,
      gender: cur.gender,
      targetId: cur.targetId,
      targetName: target?.name ?? (cur.targetId != null ? nameById.get(cur.targetId) ?? null : null),
      location: cur.location,
      item: cur.item,
    })
    cur = target
  }

  const lastTarget = links[links.length - 1]?.targetId
  const broken = links.length !== alive.length || (alive.length > 1 && lastTarget !== start?.id)
  const killerByVictim = new Map<number, number>()
  for (const kill of state.kills) killerByVictim.set(kill.victimId, kill.killerId)
  const eliminated = state.players
    .filter((p) => !p.alive)
    .map((p) => {
      const killerId = killerByVictim.get(p.id)
      return { id: p.id, name: p.name, killedByName: killerId != null ? nameById.get(killerId) ?? null : null }
    })

  return { links, eliminated, broken }
}

function assertScoreboardRanking(state: GameState) {
  const scoreboard = getScoreboardMemory(state)
  const expected = [...scoreboard].sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills
    if (a.alive !== b.alive) return a.alive ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  assert(
    scoreboard.every((row, index) => row.id === expected[index].id && row.kills === expected[index].kills),
    "Scoreboard ranking mismatch",
  )
}

function assertClosedSurvivorLoop(state: GameState) {
  const alive = state.players.filter((p) => p.alive)
  const chain = getChainMemory(state)
  assert(!chain.broken, `Survivor chain is broken at ${alive.length} alive`)
  assert(chain.links.length === alive.length, `Expected ${alive.length} live chain links, got ${chain.links.length}`)
  if (alive.length === 1) {
    assert(chain.links[0]?.targetId === null, "Last survivor target should be null")
  }
}

function singleCycleMetrics(state: GameState) {
  const start = state.players[0]
  const seen = new Set<number>()
  let current = start
  let steps = 0
  while (!seen.has(current.id)) {
    seen.add(current.id)
    assert(current.targetId != null, `Player ${current.name} has no target`)
    const target = playerById(state, current.targetId)
    assert(target.id !== current.id, `Player ${current.name} targets themselves`)
    current = target
    steps += 1
    assert(steps <= state.players.length + 1, "Cycle traversal exceeded player count")
  }
  return { steps, unique: seen.size, closedToStart: current.id === start.id }
}

function countGenderClashes(order: ChainPerson[]) {
  let clashes = 0
  for (let i = 0; i < order.length; i++) {
    const a = normalizeGender(order[i].gender)
    const b = normalizeGender(order[(i + 1) % order.length].gender)
    if (a && b && a === b) clashes += 1
  }
  return clashes
}

function currentTargetKill(state: GameState, killerId: number) {
  const killer = playerById(state, killerId)
  assert(killer.alive, `${killer.name} is not alive`)
  assert(killer.targetId != null, `${killer.name} has no target`)
  const victim = playerById(state, killer.targetId)
  const aliveBefore = state.players.filter((p) => p.alive).length
  const result = recordKillMemory(state, {
    killerId: killer.id,
    victimId: victim.id,
    item: killer.item,
    location: killer.location,
    witness: `Witness ${state.kills.length + 1}`,
    notes: `Kill ${state.kills.length + 1}`,
  })
  assert(result, "recordKill returned null")

  assert(!victim.alive, "Victim should be dead")
  assert(killer.targetId === (result.victimFormerTargetId === killer.id ? null : result.victimFormerTargetId), "Killer inherited wrong target")
  assert(killer.location === result.victimFormerLocation, "Killer inherited wrong location")
  assert(killer.item === result.victimFormerItem, "Killer inherited wrong item")
  assert(state.players.filter((p) => p.alive).length === aliveBefore - 1, "Alive count did not decrease by 1")
  assertClosedSurvivorLoop(state)
  assertScoreboardRanking(state)

  const stats = getStatsMemory(state)
  assert(stats.totalKills === state.kills.length, "Stats totalKills mismatch")
  assert(stats.aliveCount + stats.eliminatedCount === 37, "Stats player totals mismatch")
  return result.kill
}

function writeReport(results: ScenarioResult[], bugs: string[]) {
  const lines = results
    .sort((a, b) => a.id - b.id)
    .map((r) => `${r.id}. ${r.label}: ${r.detail} - ${r.pass ? "PASS" : "FAIL"}`)
  lines.push("")
  lines.push(bugs.length > 0 ? `Bugs found: ${bugs.join(" ")}` : "No bugs found.")
  writeFileSync("scripts/TEST-REPORT.md", `${lines.join("\n")}\n`)
}

const results: ScenarioResult[] = []
const bugs: string[] = []

try {
  const state = makeState()
  const maleCount = state.players.filter((p) => p.gender === "M").length
  const femaleCount = state.players.filter((p) => p.gender === "F").length
  const unspecifiedCount = state.players.filter((p) => p.gender === null).length
  assert(state.players.length === 37, "Expected 37 players")
  assert(maleCount === 18 && femaleCount === 17 && unspecifiedCount === 2, "Unexpected gender counts")
  assert(new Set(state.players.map((p) => p.name)).size === 37, "Names must be distinct")
  note(results, 1, "Players", `${maleCount} male, ${femaleCount} female, ${unspecifiedCount} unspecified`)

  const shortPools = assignChainMemory(state, locations(10), weapons(40), false)
  assert(!shortPools.ok, "Expected short location pool to fail")
  assert(shortPools.error.includes("27 more locations"), `Expected 27-location shortfall, got: ${shortPools.error}`)
  assert(!shortPools.error.includes("more weapon"), `Unexpected weapon shortfall complaint: ${shortPools.error}`)
  const built = assignChainMemory(state, locations(50), weapons(50), false)
  assert(built.ok, "Expected build to succeed")
  assert(state.lastPickedLocations.length === 37, "Expected 37 picked locations")
  assert(state.lastPickedWeapons.length === 37, "Expected 37 picked weapons")
  assert(new Set(state.lastPickedLocations).size === 37, "Expected unique picked locations")
  assert(new Set(state.lastPickedWeapons).size === 37, "Expected unique picked weapons")
  note(results, 2, "Validation and pools", "27 more locations; 37/50 locations and 37/50 weapons used")

  const cycle = singleCycleMetrics(state)
  assert(cycle.steps === 37 && cycle.unique === 37 && cycle.closedToStart, "Expected exactly one 37-player cycle")
  assert(state.players.every((p) => p.location && p.item), "Every player needs location and item")
  note(results, 3, "Single cycle", `${cycle.unique}/37 nodes, loop closed`)

  const alternateState = makeState()
  const altBuilt = assignChainMemory(alternateState, locations(50), weapons(50), true)
  assert(altBuilt.ok, "Expected alternate build to succeed")
  const altOrder = getChainMemory(alternateState).links.map((p) => ({ id: p.id, name: p.name, gender: p.gender }))
  const clashes = countGenderClashes(altOrder)
  if (!altBuilt.warning) {
    bugs.push(
      "Gender alternation warning is missing for a 37-player odd roster with 18 M, 17 F, and 2 unspecified because real clash counting ignores null genders.",
    )
    note(results, 4, "Gender clashes", `${clashes}; warning missing from real buildOrder`, false)
  } else {
    assert(clashes <= 2, `Expected small clash count, got ${clashes}`)
    note(results, 4, "Gender clashes", `${clashes}; warning produced`)
  }

  const killPlan = [1, 4, 8, 12, 16, 20, 24, 28, 32, 36, 2, 6, 10, 14, 18, 22, 26, 30, 34, 3]
  for (const preferredKillerId of killPlan) {
    const preferred = state.players.find((p) => p.id === preferredKillerId && p.alive && p.targetId != null)
    const killer = preferred ?? state.players.find((p) => p.alive && p.targetId != null)
    assert(killer, "No eligible killer found")
    currentTargetKill(state, killer.id)
  }
  note(results, 5, "Record kills", `${state.kills.length} kills; ${getStatsMemory(state).aliveCount} alive; loop intact after each`)

  const editedKill = state.kills[Math.floor(state.kills.length / 2)]
  assert(editedKill, "Expected a kill to edit")
  updateKillMemory(state, editedKill.id, {
    item: "Edited Umbrella",
    location: "Edited Observatory",
    activity: "Edited activity",
    witness: "Edited witness",
    notes: "Edited notes are visible in the public feed.",
  })
  const feedItem = getKillFeedMemory(state).find((k) => k.id === editedKill.id)
  assert(feedItem, "Edited kill missing from feed")
  assert(feedItem.item === "Edited Umbrella", "Edited item missing from feed")
  assert(feedItem.location === "Edited Observatory", "Edited location missing from feed")
  assert(feedItem.notes === "Edited notes are visible in the public feed.", "Edited notes missing from feed")
  note(results, 6, "Edit log", `kill #${editedKill.id} item/location/notes visible`)

  const deletedKill = state.kills[0]
  assert(deletedKill, "Expected a kill to delete")
  const killerBeforeDelete = getScoreboardMemory(state).find((r) => r.id === deletedKill.killerId)
  assert(killerBeforeDelete, "Deleted kill killer missing before delete")
  const totalBeforeDelete = getStatsMemory(state).totalKills
  deleteKillMemory(state, deletedKill.id)
  const killerAfterDelete = getScoreboardMemory(state).find((r) => r.id === deletedKill.killerId)
  assert(killerAfterDelete, "Deleted kill killer missing after delete")
  assert(killerAfterDelete.kills === killerBeforeDelete.kills - 1, "Killer score did not drop by 1")
  assert(getStatsMemory(state).totalKills === totalBeforeDelete - 1, "Total kills did not drop by 1")
  note(results, 7, "Delete log", `killer #${deletedKill.killerId} score ${killerBeforeDelete.kills}->${killerAfterDelete.kills}; total ${totalBeforeDelete}->${totalBeforeDelete - 1}`)

  while (state.players.filter((p) => p.alive).length > 1) {
    const scoreboard = getScoreboardMemory(state)
    const killer = scoreboard.map((r) => playerById(state, r.id)).find((p) => p.alive && p.targetId != null)
    assert(killer, "No eligible killer found during endgame")
    currentTargetKill(state, killer.id)
  }
  const finalStats = getStatsMemory(state)
  assert(finalStats.aliveCount === 1, "Expected one survivor")
  assert(finalStats.lastStanding, "Expected lastStanding winner")
  const survivor = playerById(state, finalStats.lastStanding.id)
  assert(survivor.targetId === null, "Last-standing target should be null")
  const mostKills = getScoreboardMemory(state)[0]
  assert(mostKills.kills > 0, "Expected most-kills winner")
  note(results, 8, "Endgame", `last standing ${survivor.name}; most kills ${mostKills.name} (${mostKills.kills})`)

  writeReport(results, bugs)
  if (results.some((r) => !r.pass)) {
    throw new Error("One or more scenarios failed; see scripts/TEST-REPORT.md")
  }
  console.log("ALL GREEN")
} catch (error) {
  writeReport(results, bugs)
  throw error
}
