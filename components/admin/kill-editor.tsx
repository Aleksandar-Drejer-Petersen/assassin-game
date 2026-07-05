"use client"

import { useState } from "react"
import { updateKill, deleteKill } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { KillFeedItem } from "@/lib/game"
import { Pencil, Trash2, X, Check } from "lucide-react"

function KillItem({ kill }: { kill: KillFeedItem }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateKill(fd)
          setEditing(false)
        }}
        className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={kill.id} />
        <p className="sm:col-span-2 text-sm">
          <span className="font-semibold text-primary">{kill.killerName}</span> →{" "}
          <span className="font-semibold">{kill.victimName}</span>
        </p>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Item</Label>
          <Input name="item" defaultValue={kill.item ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Location / situation</Label>
          <Input name="location" defaultValue={kill.location ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Witness</Label>
          <Input name="witness" defaultValue={kill.witness ?? ""} />
        </div>
        <input type="hidden" name="activity" value={kill.activity ?? ""} />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label className="text-xs">Notes (shown in the kill log)</Label>
          <Input name="notes" defaultValue={kill.notes ?? ""} />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button type="submit" size="sm">
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
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1 text-sm">
        <p>
          <span className="font-semibold text-primary">{kill.killerName}</span> eliminated{" "}
          <span className="font-semibold">{kill.victimName}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {[kill.item, kill.location, kill.activity].filter(Boolean).join(" · ") || "no details"}
          {kill.witness ? ` · witness: ${kill.witness}` : " · no witness"}
        </p>
        {kill.notes ? <p className="mt-1 text-xs italic text-foreground/70">“{kill.notes}”</p> : null}
      </div>
      <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="size-4" />
        <span className="sr-only">Edit kill</span>
      </Button>
      <form action={deleteKill}>
        <input type="hidden" name="id" value={kill.id} />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete kill</span>
        </Button>
      </form>
    </div>
  )
}

export function KillEditor({ kills }: { kills: KillFeedItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display uppercase tracking-wide">
          Recorded Kills ({kills.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {kills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No kills recorded yet.</p>
        ) : (
          kills.map((k) => <KillItem key={k.id} kill={k} />)
        )}
      </CardContent>
    </Card>
  )
}
