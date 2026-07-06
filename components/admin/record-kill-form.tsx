"use client"

import { useRef, useState } from "react"
import { recordKill } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PlayerRow } from "@/lib/game"
import { Crosshair } from "lucide-react"

export function RecordKillForm({ players }: { players: PlayerRow[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [killerId, setKillerId] = useState("")
  const onKiller = (v: string | null) => setKillerId(v ?? "")

  const alive = players.filter((p) => p.alive)
  const killer = alive.find((p) => String(p.id) === killerId)
  const killerName = killer?.name
  const target = killer?.targetId != null ? players.find((p) => p.id === killer.targetId) : undefined
  const canRecord = Boolean(killer && target && target.alive)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
          <Crosshair className="size-5 text-primary" />
          Record a Kill
        </CardTitle>
        <CardDescription>
          Pick who made the kill - their target, weapon and location are filled in automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={async (fd) => {
            await recordKill(fd)
            formRef.current?.reset()
            setKillerId("")
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Killer</Label>
            <Select value={killerId} onValueChange={onKiller} name="killerId" required>
              <SelectTrigger>
                <SelectValue placeholder="Who made the kill?">
                  {(value: string) =>
                    value ? players.find((p) => String(p.id) === value)?.name ?? null : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {alive.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {killer && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm sm:col-span-2">
              {target && target.alive ? (
                <p>
                  → eliminates <b>{target.name}</b>
                  {killer.item ? ` · ${killer.item}` : ""}
                  {killer.location ? ` @ ${killer.location}` : ""}
                </p>
              ) : target && !target.alive ? (
                <p className="text-amber-400">
                  → their target <b>{target.name}</b> was already eliminated. Update {killer.name}&apos;s target in
                  the Roster tab before recording.
                </p>
              ) : (
                <p>→ no current target (already won, or the chain isn&apos;t built yet)</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="k-witness">Witness</Label>
            <Input id="k-witness" name="witness" placeholder="Name (victim counts if they agree)" />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="k-notes">Notes (optional)</Label>
            <Input id="k-notes" name="notes" placeholder="A funny story — shown publicly in the kill log" />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" disabled={!canRecord}>
              {killerName ? `Confirm ${killerName}'s kill` : "Record kill"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
