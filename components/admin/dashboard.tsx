"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RecordKillForm } from "@/components/admin/record-kill-form"
import { RosterManager } from "@/components/admin/roster-manager"
import { KillEditor } from "@/components/admin/kill-editor"
import { HistoryPanel } from "@/components/admin/history-panel"
import type { PlayerRow, KillFeedItem } from "@/lib/game"

type Snap = { id: number; label: string; createdAt: Date; state: unknown }

export function Dashboard({
  players,
  kills,
  snapshots,
}: {
  players: PlayerRow[]
  kills: KillFeedItem[]
  snapshots: Snap[]
}) {
  return (
    <Tabs defaultValue="kills">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="kills">Record</TabsTrigger>
        <TabsTrigger value="roster">Roster</TabsTrigger>
        <TabsTrigger value="log">Edit Log</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="kills" className="mt-6 flex flex-col gap-6">
        <RecordKillForm players={players} />
        <KillEditor kills={kills} />
      </TabsContent>

      <TabsContent value="roster" className="mt-6">
        <RosterManager players={players} />
      </TabsContent>

      <TabsContent value="log" className="mt-6">
        <KillEditor kills={kills} />
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <HistoryPanel snapshots={snapshots} />
      </TabsContent>
    </Tabs>
  )
}
