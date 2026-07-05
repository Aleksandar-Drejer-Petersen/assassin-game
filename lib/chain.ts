// Pure, DB-free logic for turning a roster into a single circular kill chain.
// Kept separate from the server actions so the ordering rules are easy to
// reason about (and unit-test) in isolation.

export type ChainPerson = { id: number; name: string; gender: string | null }

/** Normalize free-form gender input to "M" | "F" | null. */
export function normalizeGender(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  if (["m", "male", "boy", "b", "man"].includes(s)) return "M"
  if (["f", "female", "girl", "g", "woman", "w"].includes(s)) return "F"
  return null
}

/** Fisher–Yates shuffle, returns a new array. */
export function shuffle<T>(input: readonly T[]): T[] {
  const a = [...input]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Pick `n` items from `pool`, spread as evenly as possible. Every item is used
 * once before any is used twice, twice before any is used three times, and so
 * on — so usage counts never differ by more than 1 (no random over-use). The
 * order within each full pass is shuffled. Returns [] for an empty pool.
 */
export function distribute<T>(pool: readonly T[], n: number): T[] {
  const out: T[] = []
  if (pool.length === 0 || n <= 0) return out
  while (out.length < n) {
    for (const item of shuffle(pool)) {
      if (out.length >= n) break
      out.push(item)
    }
  }
  return out
}

export type OrderResult = {
  /** Players in cycle order. order[i] hunts order[(i+1) % n]. */
  order: ChainPerson[]
  /** Human-readable note when perfect alternation wasn't achievable. */
  genderWarning: string | null
}

/**
 * Produce a single-cycle ordering of every player.
 *
 * Because we simply lay the players out in a line and later close the loop
 * (last → first), ANY permutation yields exactly one cycle that visits every
 * player once. That is what guarantees the game can never split into two
 * separate circles.
 */
export function buildOrder(people: readonly ChainPerson[], alternate: boolean): OrderResult {
  if (!alternate) {
    return { order: shuffle(people), genderWarning: null }
  }

  const boys = shuffle(people.filter((p) => normalizeGender(p.gender) === "M"))
  const girls = shuffle(people.filter((p) => normalizeGender(p.gender) === "F"))
  const unknown = shuffle(people.filter((p) => normalizeGender(p.gender) === null))

  // Spread ungendered players into whichever side keeps the two sides balanced,
  // so they act as filler and cause the fewest same-gender neighbours.
  for (const p of unknown) {
    if (boys.length <= girls.length) boys.push(p)
    else girls.push(p)
  }

  // Interleave, leading with the larger group: A b A b A ... trailing A's.
  const [big, small] = boys.length >= girls.length ? [boys, girls] : [girls, boys]
  const order: ChainPerson[] = []
  for (let i = 0; i < big.length; i++) {
    order.push(big[i])
    if (i < small.length) order.push(small[i])
  }

  // A hand-off around the loop is "clean" only when it goes boy→girl or
  // girl→boy. Anything else breaks the alternation — same gender back-to-back,
  // OR a player with no gender set — so count all of those. (Counting only real
  // M/F clashes missed rosters where "unspecified" players sat at the seam,
  // making the warning luck-dependent.)
  let imperfect = 0
  for (let i = 0; i < order.length; i++) {
    const a = normalizeGender(order[i].gender)
    const b = normalizeGender(order[(i + 1) % order.length].gender)
    const cleanPair = (a === "M" && b === "F") || (a === "F" && b === "M")
    if (!cleanPair) imperfect++
  }

  const nBoys = people.filter((p) => normalizeGender(p.gender) === "M").length
  const nGirls = people.filter((p) => normalizeGender(p.gender) === "F").length
  let genderWarning: string | null = null
  if (imperfect > 0) {
    genderWarning =
      `Couldn't perfectly alternate boy↔girl (${nBoys} boys, ${nGirls} girls` +
      `${unknown.length ? `, ${unknown.length} with no gender set` : ""}). ` +
      `${imperfect} of the ${order.length} hand-off${imperfect === 1 ? "" : "s"} ` +
      `${imperfect === 1 ? "isn't" : "aren't"} a boy→girl pair. ` +
      `Perfect alternation needs an equal number of boys and girls, each with a gender set.`
  }

  return { order, genderWarning }
}
