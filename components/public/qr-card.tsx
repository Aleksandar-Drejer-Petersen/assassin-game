"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Printer } from "lucide-react"

export function QrCard() {
  const [url, setUrl] = useState("")

  useEffect(() => {
    setUrl(window.location.origin + "/")
  }, [])

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="rounded-lg bg-white p-3">
          {url ? (
            <QRCodeSVG value={url} size={148} level="M" />
          ) : (
            <div className="h-[148px] w-[148px] animate-pulse rounded bg-muted" />
          )}
        </div>
        <div className="text-center">
          <p className="font-display text-lg font-semibold uppercase tracking-wide">Spread the intel</p>
          <p className="text-pretty text-sm text-muted-foreground">
            Scan to open the live kill log and scoreboard.
          </p>
        </div>
        <Link
          href="/poster"
          className={cn(buttonVariants({ variant: "outline" }), "w-full bg-transparent")}
        >
          <Printer className="mr-2 size-4" />
          Print poster
        </Link>
      </CardContent>
    </Card>
  )
}
