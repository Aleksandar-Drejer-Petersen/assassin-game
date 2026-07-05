"use client"

import { useRef, useState } from "react"
import { addPlayer, updatePlayer, deletePlayer } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PlayerRow } from "@/lib/game"
import { UserPlus, Pencil, Trash2, X, Check } from "lucide-react"

function TargetSelect({
  name,
  defaultValue,
  players,
  excludeId,
}: {
  name: string
  defaultValue?: number | null
  players: PlayerRow[]
  excludeId?: number
}) {
  const [value, setValue] = useState(defaultValue ? String(defaultValue) : "none")
  return (
    <>
      <input type="hidden" name={name} value={value === "none" ? "" : value} />
      <Select value={value} onValueChange={(v) => setValue(v ?? "none")}>
        <SelectTrigger>
          <SelectValue placeholder="No target" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No target</SelectItem>
          {players
            .filter((p) => p.id !== excludeId)
            .map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </>
  )
}

function PlayerRowItem({ player, players }: { player: PlayerRow; players: PlayerRow[] }) {
  const [editing, setEditing] = useState(false)
  const targetName = players.find((p) => p.id === player.targetId)?.name

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updatePlayer(fd)
          setEditing(false)
        }}
        className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={player.id} />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name</Label>
          <Input name="name" defaultValue={player.name} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Target</Label>
          <TargetSelect name="targetId" defaultValue={player.targetId} players={players} excludeId={player.id} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Location</Label>
          <Input name="location" defaultValue={player.location ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Item</Label>
          <Input name="item" defaultValue={player.item ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Gender</Label>
          <Select name="gender" defaultValue={player.gender ?? "none"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unspecified</SelectItem>
              <SelectItem value="M">Boy</SelectItem>
              <SelectItem value="F">Girl</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Status</Label>
          <Select name="alive" defaultValue={player.alive ? "true" : "false"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Alive</SelectItem>
              <SelectItem value="false">Eliminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" className="flex-1">
            <Check className="mr-1 size-4" /> Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
            <X className="size-4" />
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{player.name}</p>
          {player.alive ? (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
              Alive
            </Badge>
          ) : (
            <Badge variant="outline" className="border-primary/40 text-primary">
              Dead
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          Target: {targetName ?? "—"}
          {player.location ? ` · ${player.location}` : ""}
          {player.item ? ` · ${player.item}` : ""}
        </p>
      </div>
      <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="size-4" />
        <span className="sr-only">Edit {player.name}</span>
      </Button>
      <form action={deletePlayer}>
        <input type="hidden" name="id" value={player.id} />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete {player.name}</span>
        </Button>
      </form>
    </div>
  )
}

export function RosterManager({ players }: { players: PlayerRow[] }) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
            <UserPlus className="size-5 text-primary" />
            Add Player
          </CardTitle>
          <CardDescription>Assign their starting target, location, and item.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            action={async (fd) => {
              await addPlayer(fd)
              formRef.current?.reset()
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" name="name" placeholder="Student name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Target</Label>
              <TargetSelect name="targetId" players={players} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-location">Location</Label>
              <Input id="p-location" name="location" placeholder="e.g. library" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-item">Item</Label>
              <Input id="p-item" name="item" placeholder="e.g. rubber duck" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Gender</Label>
              <Select name="gender" defaultValue="none">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unspecified</SelectItem>
                  <SelectItem value="M">Boy</SelectItem>
                  <SelectItem value="F">Girl</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full">
                Add player
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wide">
            Roster ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players yet. Add some above.</p>
          ) : (
            players.map((p) => <PlayerRowItem key={p.id} player={p} players={players} />)
          )}
        </CardContent>
      </Card>
    </div>
  )
}
