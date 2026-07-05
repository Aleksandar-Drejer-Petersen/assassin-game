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
  const [victimId, setVictimId] = useState("")
  const onKiller = (v: string | null) => setKillerId(v ?? "")
  const onVictim = (v: string | null) => setVictimId(v ?? "")

  const alive = players.filter((p) => p.alive)
  const killerName = players.find((p) => String(p.id) === killerId)?.name

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
          <Crosshair className="size-5 text-primary" />
          Record a Kill
        </CardTitle>
        <CardDescription>
          The killer inherits the victim&apos;s target, location, and item automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={async (fd) => {
            await recordKill(fd)
            formRef.current?.reset()
            setKillerId("")
            setVictimId("")
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-2">
            <Label>Killer</Label>
            <Select value={killerId} onValueChange={onKiller} name="killerId" required>
              <SelectTrigger>
                <SelectValue placeholder="Who made the kill?" />
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

          <div className="flex flex-col gap-2">
            <Label>Victim</Label>
            <Select value={victimId} onValueChange={onVictim} name="victimId" required>
              <SelectTrigger>
                <SelectValue placeholder="Who was eliminated?" />
              </SelectTrigger>
              <SelectContent>
                {alive
                  .filter((p) => String(p.id) !== killerId)
                  .map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="k-item">Item used</Label>
            <Input id="k-item" name="item" placeholder="e.g. spoon" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="k-location">Location</Label>
            <Input id="k-location" name="location" placeholder="e.g. cafeteria" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="k-activity">Activity (optional)</Label>
            <Input id="k-activity" name="activity" placeholder="e.g. eating lunch" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="k-witness">Witness</Label>
            <Input id="k-witness" name="witness" placeholder="Name (victim counts if they agree)" />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" disabled={!killerId || !victimId}>
              {killerName ? `Confirm ${killerName}'s kill` : "Record kill"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
