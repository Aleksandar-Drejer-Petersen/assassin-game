"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ChainView } from "@/lib/game"
import { AlertTriangle, FileDown, Trophy, Skull } from "lucide-react"

const SIZE = 440
const CENTER = SIZE / 2
const RADIUS = SIZE / 2 - 64

function genderColor(g: string | null) {
  if (g === "M") return "var(--color-sky-400, #38bdf8)"
  if (g === "F") return "var(--color-pink-400, #f472b6)"
  return "currentColor"
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function ChainGraph({ chain }: { chain: ChainView }) {
  const { links, eliminated, broken } = chain
  const n = links.length

  if (n === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wide">Kill chain</CardTitle>
          <CardDescription>
            No live chain yet. Add students and build the chain from the Setup tab.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const indexById = new Map(links.map((l, i) => [l.id, i]))
  const pos = links.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: CENTER + RADIUS * Math.cos(a), y: CENTER + RADIUS * Math.sin(a), a }
  })

  const downloadMissionList = () => {
    const now = new Date()
    const displayDate = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(now)
    const filenameDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const missionLines = links
      .map((l) => {
        if (!l.targetName) return null
        const item = l.item?.trim()
        const location = l.location?.trim()
        return `<p><b>${escapeHtml(l.name)}</b> hunts <b>${escapeHtml(l.targetName)}</b>${item ? ` &middot; ${escapeHtml(item)}` : ""}${location ? ` @ ${escapeHtml(location)}` : ""}</p>`
      })
      .filter(Boolean)
      .join("")
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Assassins - Kill Missions</title>
  <style>
    body { background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; }
    h1 { font-size: 16pt; margin: 0 0 18pt; }
    p { margin: 0 0 10pt; }
  </style>
</head>
<body>
  <h1>Assassins &mdash; Kill Missions ${escapeHtml(displayDate)}</h1>
  ${missionLines}
</body>
</html>`
    const blob = new Blob([html], { type: "application/msword" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `assassins-missions-${filenameDate}.doc`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
              Live kill chain
              {n === 1 && <Trophy className="size-5 text-amber-400" />}
            </CardTitle>
            {n >= 2 && (
              <Button variant="outline" onClick={downloadMissionList} className="w-fit">
                <FileDown className="size-4" />
                Download mission list
              </Button>
            )}
          </div>
          <CardDescription>
            {n === 1
              ? "One survivor left — the last one standing."
              : `${n} still in the hunt. Each arrow points from a hunter to their current target.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {broken && n > 1 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                The survivors don&apos;t currently form one closed loop — likely a manually edited target.
                Rebuild from Setup to restore a single circle.
              </span>
            </div>
          )}

          {n > 1 && (
            <div className="mx-auto w-full max-w-[440px]">
              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full text-muted-foreground">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="var(--color-primary, #ef4444)" />
                  </marker>
                </defs>
                {links.map((l, i) => {
                  const t = l.targetId != null ? indexById.get(l.targetId) : undefined
                  if (t === undefined) return null
                  const from = pos[i]
                  const to = pos[t]
                  const dx = to.x - from.x
                  const dy = to.y - from.y
                  const len = Math.hypot(dx, dy) || 1
                  const ux = dx / len
                  const uy = dy / len
                  const sx = from.x + ux * 16
                  const sy = from.y + uy * 16
                  const ex = to.x - ux * 18
                  const ey = to.y - uy * 18
                  return (
                    <line
                      key={`e-${l.id}`}
                      x1={sx}
                      y1={sy}
                      x2={ex}
                      y2={ey}
                      stroke="var(--color-primary, #ef4444)"
                      strokeOpacity={0.5}
                      strokeWidth={1.5}
                      markerEnd="url(#arrow)"
                    />
                  )
                })}
                {links.map((l, i) => {
                  const p = pos[i]
                  const anchor = Math.cos(p.a) > 0.2 ? "start" : Math.cos(p.a) < -0.2 ? "end" : "middle"
                  const lx = CENTER + (RADIUS + 14) * Math.cos(p.a)
                  const ly = CENTER + (RADIUS + 14) * Math.sin(p.a)
                  return (
                    <g key={`n-${l.id}`}>
                      <circle cx={p.x} cy={p.y} r={6} fill={genderColor(l.gender)} />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor={anchor}
                        dominantBaseline="middle"
                        fontSize={11}
                        fill="currentColor"
                        className="fill-foreground"
                      >
                        {l.name}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )}

          {/* Precise who-hunts-whom list */}
          <ol className="flex flex-col gap-1.5">
            {links.map((l) => (
              <li key={`row-${l.id}`} className="rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{l.name}</span>
                {l.targetName ? (
                  <>
                    <span className="text-muted-foreground"> hunts </span>
                    <span className="font-medium text-primary">{l.targetName}</span>
                    <span className="text-muted-foreground">
                      {l.item ? ` · ${l.item}` : ""}
                      {l.location ? ` @ ${l.location}` : ""}
                    </span>
                  </>
                ) : (
                  <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-400">winner</Badge>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {eliminated.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
              <Skull className="size-5 text-muted-foreground" /> Eliminated ({eliminated.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {eliminated.map((e) => (
              <span key={e.id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground line-through">
                {e.name}
                {e.killedByName ? <span className="no-underline"> ← {e.killedByName}</span> : null}
              </span>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
