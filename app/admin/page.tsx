import { isAuthenticated } from "@/lib/auth"
import { logout } from "@/app/actions/admin"
import { getPlayers, getKillFeed, getSnapshots, getPools, getChain } from "@/lib/game"
import { LoginForm } from "@/components/admin/login-form"
import { Dashboard } from "@/components/admin/dashboard"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Crosshair, LogOut, ExternalLink } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const authed = await isAuthenticated()

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <LoginForm />
      </main>
    )
  }

  const [players, kills, snapshots, pools, chain] = await Promise.all([
    getPlayers(),
    getKillFeed(),
    getSnapshots(),
    getPools(),
    getChain(),
  ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Crosshair className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold uppercase leading-none tracking-wide">
              Game Control
            </h1>
            <p className="text-sm text-muted-foreground">Admin dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-transparent")}
          >
            <ExternalLink className="mr-1 size-4" />
            View board
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="mr-1 size-4" />
              Log out
            </Button>
          </form>
        </div>
      </header>

      <Dashboard players={players} kills={kills} snapshots={snapshots} pools={pools} chain={chain} />
    </main>
  )
}
