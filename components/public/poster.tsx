"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Printer, Crosshair } from "lucide-react"

export function Poster() {
  const [url, setUrl] = useState("")

  useEffect(() => {
    setUrl(window.location.origin + "/")
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex justify-center print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 size-4" />
          Print this poster
        </Button>
      </div>

      <div className="poster mx-auto flex aspect-[3/4] w-full flex-col items-center justify-between rounded-xl border border-border bg-card p-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <Crosshair className="size-14 text-primary" />
          <h1 className="font-display text-5xl font-bold uppercase tracking-wide">Assassins</h1>
          <p className="text-lg text-muted-foreground">The hunt is on.</p>
        </div>

        <div className="rounded-2xl bg-white p-6">
          {url ? (
            <QRCodeSVG value={url} size={260} level="M" />
          ) : (
            <div className="size-[260px] animate-pulse rounded bg-muted" />
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="font-display text-2xl font-semibold uppercase tracking-wide">Scan Me</p>
          <p className="text-pretty text-base text-muted-foreground">
            See the live kill log, scoreboard, and who&apos;s still alive.
          </p>
        </div>
      </div>

      <style jsx global>{`
        /* Screen stays dark & cool. When printing, flip to black-on-white so it
           uses almost no ink: white background, black title/QR/icon, thin frame. */
        @media print {
          body {
            background: white !important;
          }
          .poster {
            background: white !important;
            color: black !important;
            border: 1px solid black !important;
            box-shadow: none !important;
            aspect-ratio: auto;
            min-height: 92vh;
          }
          .poster * {
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
