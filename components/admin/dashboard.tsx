"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RecordKillForm } from "@/components/admin/record-kill-form"
import { RosterManager } from "@/components/admin/roster-manager"
import { KillEditor } from "@/components/admin/kill-editor"
import { HistoryPanel } from "@/components/admin/history-panel"
import { GameSetup } from "@/components/admin/game-setup"
import { ChainGraph } from "@/components/admin/chain-graph"
import type { PlayerRow, KillFeedItem, Pools, ChainView } from "@/lib/game"

type Snap = { id: number; label: string; createdAt: Date; state: unknown }

export function Dashboard({
  players,
  kills,
  snapshots,
  pools,
  chain,
}: {
  players: PlayerRow[]
  kills: KillFeedItem[]
  snapshots: Snap[]
  pools: Pools
  chain: ChainView
}) {
  return (
    <Tabs defaultValue="kills">
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
        <TabsTrigger value="kills">Record</TabsTrigger>
        <TabsTrigger value="setup">Setup</TabsTrigger>
        <TabsTrigger value="chain">Chain</TabsTrigger>
        <TabsTrigger value="roster">Roster</TabsTrigger>
        <TabsTrigger value="log">Edit Log</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="kills" className="mt-6 flex flex-col gap-6">
        <RecordKillForm players={players} />
        <KillEditor kills={kills} />
      </TabsContent>

      <TabsContent value="setup" className="mt-6">
        <GameSetup players={players} pools={pools} />
      </TabsContent>

      <TabsContent value="chain" className="mt-6">
        <ChainGraph chain={chain} />
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
