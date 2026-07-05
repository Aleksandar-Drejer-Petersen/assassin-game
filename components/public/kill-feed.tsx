import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { KillFeedItem } from "@/lib/game"
import { MapPin, Package, Eye, Activity } from "lucide-react"

function formatDate(d: Date) {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function KillFeed({ kills }: { kills: KillFeedItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display uppercase tracking-wide">Kill Log</CardTitle>
      </CardHeader>
      <CardContent>
        {kills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No kills recorded yet. The hunt begins soon.</p>
        ) : (
          <ol className="relative space-y-6 border-l border-border pl-6">
            {kills.map((k) => (
              <li key={k.id} className="relative">
                <span className="absolute -left-[27px] top-1 flex size-3.5 items-center justify-center rounded-full border-2 border-primary bg-background" />
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-primary">{k.killerName}</span>
                  <span className="text-sm text-muted-foreground">eliminated</span>
                  <span className="font-semibold">{k.victimName}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(k.occurredAt)}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {k.item ? (
                    <span className="inline-flex items-center gap-1">
                      <Package className="size-3.5" /> {k.item}
                    </span>
                  ) : null}
                  {k.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {k.location}
                    </span>
                  ) : null}
                  {k.activity ? (
                    <span className="inline-flex items-center gap-1">
                      <Activity className="size-3.5" /> {k.activity}
                    </span>
                  ) : null}
                  {k.witness ? (
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3.5" /> {k.witness}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
