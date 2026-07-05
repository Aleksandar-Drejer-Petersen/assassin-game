"use client"

import { rollbackTo } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { History, Undo2 } from "lucide-react"

type Snap = {
  id: number
  label: string
  createdAt: Date
  state: unknown
}

function count(state: unknown, key: "players" | "kills") {
  const s = state as Record<string, unknown[]>
  return Array.isArray(s?.[key]) ? s[key].length : 0
}

export function HistoryPanel({ snapshots }: { snapshots: Snap[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
          <History className="size-5 text-primary" />
          Version History
        </CardTitle>
        <CardDescription>
          A snapshot is saved before every change. Roll back to undo mistakes — the current state is saved
          first, so rollbacks are reversible too.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history yet. Changes will appear here.</p>
        ) : (
          snapshots.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleString()} · {count(s.state, "players")} players,{" "}
                  {count(s.state, "kills")} kills
                </p>
              </div>
              <form
                action={async (fd) => {
                  if (confirm(`Restore the game to this point?\n\n"${s.label}"`)) {
                    await rollbackTo(fd)
                  }
                }}
              >
                <input type="hidden" name="id" value={s.id} />
                <Button type="submit" size="sm" variant="outline" className="bg-transparent">
                  <Undo2 className="mr-1 size-4" />
                  Restore
                </Button>
              </form>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
