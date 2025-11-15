"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteFromClient } from "@/app/dashboard/actions/groups";
import { useRouter } from "next/navigation";

export function AcceptInviteDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await acceptInviteFromClient(inviteCode);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setOpen(false);
      setIsLoading(false);
      setInviteCode("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Join Group</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join a Group</DialogTitle>
            <DialogDescription>
              Enter the invite code shared by your partner to join their group.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Invite Code</Label>
              <Input
                id="code"
                name="code"
                placeholder="Enter code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                disabled={isLoading}
                className="font-mono text-lg text-center tracking-wider uppercase"
                maxLength={8}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !inviteCode}>
              {isLoading ? "Joining..." : "Join Couple"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
