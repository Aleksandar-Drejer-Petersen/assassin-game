"use client"

import * as React from "react"
import { useRef, useState, useTransition } from "react"
import { bulkAddPlayers, savePools, assignChain, type AssignResult } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PlayerRow } from "@/lib/game"
import { Users, MapPin, Swords, Shuffle, AlertTriangle, CheckCircle2 } from "lucide-react"

function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-40 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  )
}

function genderBadge(g: string | null) {
  if (g === "M") return <Badge variant="outline" className="border-sky-500/40 text-sky-400">boy</Badge>
  if (g === "F") return <Badge variant="outline" className="border-pink-500/40 text-pink-400">girl</Badge>
  return null
}

export function GameSetup({
  players,
  pools,
}: {
  players: PlayerRow[]
  pools: { locations: string[]; weapons: string[] }
}) {
  const n = players.length
  const studentsRef = useRef<HTMLFormElement>(null)

  const [alternate, setAlternate] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<AssignResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const locCount = pools.locations.length
  const wpnCount = pools.weapons.length
  const enoughLoc = locCount >= n
  const enoughWpn = wpnCount >= n

  function runBuild() {
    setConfirming(false)
    const fd = new FormData()
    fd.set("alternate", alternate ? "true" : "false")
    startTransition(async () => {
      const res = await assignChain(fd)
      setResult(res)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Column 1: students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
            <Users className="size-5 text-primary" /> 1 · Students ({n})
          </CardTitle>
          <CardDescription>
            One name per line. Add a gender after a comma for the alternating option — e.g.{" "}
            <code className="text-foreground">Alex, M</code> or <code className="text-foreground">Sam, girl</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form
            ref={studentsRef}
            action={async (fd) => {
              await bulkAddPlayers(fd)
              studentsRef.current?.reset()
            }}
            className="flex flex-col gap-3"
          >
            <TextArea name="names" placeholder={"Alex, M\nSam, F\nJordan"} />
            <Button type="submit" variant="outline" className="self-start">
              Add students
            </Button>
          </form>
          {n > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {players.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs">
                  {p.name} {genderBadge(p.gender)}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Names add to the roster (they won&apos;t replace anyone). Edit or remove individuals in the Roster tab.
          </p>
        </CardContent>
      </Card>

      {/* Columns 2 & 3: pools */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wide">2 · Locations &amp; Weapons</CardTitle>
          <CardDescription>One per line. You need at least {n || "N"} of each (one per student).</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={savePools} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> Locations / situations
                <span className={cn("ml-auto text-xs", enoughLoc ? "text-emerald-400" : "text-primary")}>
                  {locCount}/{n || 0}
                </span>
              </Label>
              <TextArea name="locations" defaultValue={pools.locations.join("\n")} placeholder={"in the library\nwhile singing\nplaying a sport with 5+ people"} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-2">
                <Swords className="size-4 text-primary" /> Weapons / items
                <span className={cn("ml-auto text-xs", enoughWpn ? "text-emerald-400" : "text-primary")}>
                  {wpnCount}/{n || 0}
                </span>
              </Label>
              <TextArea name="weapons" defaultValue={pools.weapons.join("\n")} placeholder={"spoon\nrubber duck\npaper clip"} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="outline">Save locations &amp; weapons</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Build */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
            <Shuffle className="size-5 text-primary" /> 3 · Build the kill chain
          </CardTitle>
          <CardDescription>
            Assigns one location + weapon to each student and links everyone into a single continuous circle.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={alternate}
              onChange={(e) => setAlternate(e.target.checked)}
              className="size-4 accent-primary"
            />
            <span>
              <span className="font-medium">Alternate genders</span> — try to make each boy hunt a girl and each girl hunt a boy.
            </span>
          </label>

          {!confirming ? (
            <Button type="button" onClick={() => setConfirming(true)} disabled={isPending} className="w-full">
              {isPending ? "Building…" : "Auto-assign & build chain"}
            </Button>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="flex items-start gap-2 text-sm text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                This resets the game — the kill log is cleared and everyone is set back to alive. You can undo it from the History tab.
              </p>
              <div className="flex gap-2">
                <Button type="button" onClick={runBuild} disabled={isPending} className="flex-1">
                  {isPending ? "Building…" : "Yes, build the chain"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {result && !result.ok && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{result.error}</span>
            </div>
          )}
          {result && result.ok && (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>Chain built — {n} students in one circle. Open the Chain tab to see it.</span>
              </div>
              {result.warning && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-400">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{result.warning}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
