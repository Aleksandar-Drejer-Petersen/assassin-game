import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ScoreRow } from "@/lib/game"
import { Skull } from "lucide-react"

export function Scoreboard({ rows }: { rows: ScoreRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display uppercase tracking-wide">Scoreboard</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No players yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row, i) => (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  !row.alive && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md font-display text-sm font-bold",
                    i === 0 && row.kills > 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-medium",
                      !row.alive && "line-through",
                    )}
                  >
                    {row.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.kills} {row.kills === 1 ? "kill" : "kills"}
                  </p>
                </div>
                {row.alive ? (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                    Alive
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    <Skull className="mr-1 size-3" />
                    Dead
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
