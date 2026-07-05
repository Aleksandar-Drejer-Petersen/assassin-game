"use client"

import { useActionState } from "react"
import { login } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Lock } from "lucide-react"

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null as { error?: string } | null)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Lock className="size-6" />
        </div>
        <CardTitle className="font-display uppercase tracking-wide">Admin Access</CardTitle>
        <CardDescription>Enter the password to manage the game.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoFocus required />
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Checking..." : "Enter"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
