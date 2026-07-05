import { Card } from "@/components/ui/card"
import { Users, Skull, Crosshair, Trophy } from "lucide-react"

type Stats = {
  totalPlayers: number
  aliveCount: number
  eliminatedCount: number
  totalKills: number
  topKiller: { name: string; kills: number } | null
  lastStanding: { name: string } | null
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="flex flex-row items-center gap-3 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-display text-xl font-semibold leading-tight">{value}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </Card>
  )
}

export function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        icon={<Users className="size-5" />}
        label="Still Alive"
        value={`${stats.aliveCount} / ${stats.totalPlayers}`}
      />
      <Stat icon={<Skull className="size-5" />} label="Eliminated" value={String(stats.eliminatedCount)} />
      <Stat icon={<Crosshair className="size-5" />} label="Total Kills" value={String(stats.totalKills)} />
      <Stat
        icon={<Trophy className="size-5" />}
        label="Top Assassin"
        value={stats.topKiller ? stats.topKiller.name : "—"}
        hint={stats.topKiller ? `${stats.topKiller.kills} kills` : "No kills yet"}
      />
    </div>
  )
}
