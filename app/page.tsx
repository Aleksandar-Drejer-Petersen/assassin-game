import { getScoreboard, getKillFeed, getStats } from "@/lib/game"
import { StatsBar } from "@/components/public/stats-bar"
import { Scoreboard } from "@/components/public/scoreboard"
import { KillFeed } from "@/components/public/kill-feed"
import { QrCard } from "@/components/public/qr-card"
import { Card, CardContent } from "@/components/ui/card"
import { Crosshair, Trophy } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [scoreboard, kills, stats] = await Promise.all([
    getScoreboard(),
    getKillFeed(),
    getStats(),
  ])

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <header className="mb-8 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Crosshair className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-wide md:text-3xl">
              Assassins
            </h1>
            <p className="text-sm text-muted-foreground">Live kill log &amp; scoreboard</p>
          </div>
        </div>
      </header>

      {stats.lastStanding ? (
        <Card className="mb-6 border-primary/40 bg-primary/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="size-5 text-primary" />
            <p className="text-pretty">
              <span className="font-semibold text-primary">{stats.lastStanding.name}</span> is the last one
              standing!
            </p>
          </CardContent>
        </Card>
      ) : null}

      <StatsBar stats={stats} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-6">
          <Scoreboard rows={scoreboard} />
          {/* Desktop: QR sits under the scoreboard. On mobile it moves to the very bottom. */}
          <div className="hidden lg:block">
            <QrCard />
          </div>
        </div>
        <KillFeed kills={kills} />
      </div>

      {/* Mobile only: QR at the very bottom, after the kill log */}
      <div className="mt-6 lg:hidden">
        <QrCard />
      </div>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Two ways to win: be the last survivor, or rack up the most kills.
      </footer>
    </main>
  )
}
