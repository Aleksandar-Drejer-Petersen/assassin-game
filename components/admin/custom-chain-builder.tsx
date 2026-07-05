"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { assignCustomChain, type AssignResult } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buildOrder, shuffle } from "@/lib/chain"
import { cn } from "@/lib/utils"
import type { PlayerRow } from "@/lib/game"
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, GripVertical } from "lucide-react"

function genderBadge(g: string | null) {
  if (g === "M") return <Badge variant="outline" className="border-sky-500/40 text-sky-400">boy</Badge>
  if (g === "F") return <Badge variant="outline" className="border-pink-500/40 text-pink-400">girl</Badge>
  return null
}

function sameIdSet(a: PlayerRow[], b: PlayerRow[]) {
  if (a.length !== b.length) return false
  const ids = new Set(a.map((p) => p.id))
  return b.every((p) => ids.has(p.id))
}

function move<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function CustomChainBuilder({
  players,
  pools,
}: {
  players: PlayerRow[]
  pools: { locations: string[]; weapons: string[] }
}) {
  const [order, setOrder] = useState<PlayerRow[]>(players)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [alternate, setAlternate] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<AssignResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const previousPlayers = useRef(players)

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const firstName = order[0]?.name
  const lastName = order[order.length - 1]?.name
  const shortfall = order.length > 0 && (pools.locations.length < order.length || pools.weapons.length < order.length)

  useEffect(() => {
    if (!sameIdSet(previousPlayers.current, players)) {
      setOrder(players)
      previousPlayers.current = players
      return
    }

    setOrder((current) => current.map((p) => playersById.get(p.id) ?? p))
    previousPlayers.current = players
  }, [players, playersById])

  function moveRow(from: number, to: number) {
    setOrder((current) => move(current, from, to))
    setResult(null)
  }

  function resetOrder() {
    setOrder(players)
    setConfirming(false)
    setResult(null)
  }

  function randomizeOrder() {
    if (alternate) {
      const res = buildOrder(
        players.map((p) => ({ id: p.id, name: p.name, gender: p.gender })),
        true,
      )
      setOrder(res.order.map((p) => playersById.get(p.id)).filter((p): p is PlayerRow => Boolean(p)))
    } else {
      setOrder(shuffle(players))
    }
    setConfirming(false)
    setResult(null)
  }

  function runBuild() {
    setConfirming(false)
    const fd = new FormData()
    fd.set("order", order.map((p) => p.id).join(","))
    startTransition(async () => {
      const res = await assignCustomChain(fd)
      setResult(res)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display uppercase tracking-wide">4 &middot; Custom order (optional)</CardTitle>
        <CardDescription>
          Drag students to set who hunts whom. The order IS the circle - each hunts the next, and the last hunts the
          first back around.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={alternate}
              onChange={(e) => setAlternate(e.target.checked)}
              className="size-4 accent-primary"
            />
            <span>
              <span className="font-medium">Alternate boy/girl</span>
            </span>
          </label>
          <Button type="button" variant="outline" onClick={randomizeOrder} disabled={isPending || players.length < 2}>
            Randomize
          </Button>
        </div>

        {order.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add students first, then arrange the custom chain here.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {order.map((player, index) => (
              <div
                key={player.id}
                draggable
                onDragStart={(event) => {
                  setDragIndex(index)
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", String(index))
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOverIndex(index)
                }}
                onDragLeave={() => setDragOverIndex((current) => (current === index ? null : current))}
                onDrop={(event) => {
                  event.preventDefault()
                  const from = dragIndex ?? Number(event.dataTransfer.getData("text/plain"))
                  moveRow(from, index)
                  setDragIndex(null)
                  setDragOverIndex(null)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setDragOverIndex(null)
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border p-3 transition-colors",
                  dragOverIndex === index && "border-primary/60 bg-primary/10",
                )}
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                <span className="w-7 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{player.name}</p>
                    {genderBadge(player.gender)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => moveRow(index, index - 1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="size-4" />
                    <span className="sr-only">Move {player.name} up</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => moveRow(index, index + 1)}
                    disabled={index === order.length - 1}
                  >
                    <ArrowDown className="size-4" />
                    <span className="sr-only">Move {player.name} down</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {order.length >= 2 && (
          <p className="text-sm text-muted-foreground">
            ... and {lastName} hunts {firstName} to close the loop.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={resetOrder} disabled={isPending || order.length === 0}>
            Reset order
          </Button>
          {!confirming ? (
            <Button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={isPending || order.length < 2}
              className="flex-1"
            >
              {isPending ? "Building..." : "Build from this order"}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
              Cancel
            </Button>
          )}
        </div>

        {confirming && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            {shortfall && (
              <p className="flex items-start gap-2 text-sm text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Some situations or weapons will repeat because you have {pools.locations.length} location
                {pools.locations.length === 1 ? "" : "s"}/situations and {pools.weapons.length} weapon
                {pools.weapons.length === 1 ? "" : "s"} for {order.length} students. They will be spread evenly.
              </p>
            )}
            <p className="flex items-start gap-2 text-sm text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              This resets the game - the kill log is cleared and everyone is set back to alive. You can undo it from
              the History tab.
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={runBuild} disabled={isPending} className="flex-1">
                {isPending ? "Building..." : "Yes, build this order"}
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
              <span>Custom chain built - open the Chain tab.</span>
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
  )
}
