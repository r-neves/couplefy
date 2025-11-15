"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateInviteFromClient } from "@/app/dashboard/actions/groups";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteDialogProps {
  groupId: string;
  groupName: string;
}

export function InviteDialog({ groupId, groupName }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerateInvite() {
    setIsLoading(true);
    setError("");

    const result = await generateInviteFromClient(groupId);

    if (result.error) {
      setError(result.error);
    } else if ("inviteCode" in result && result.inviteCode) {
      setInviteCode(result.inviteCode);
    }

    setIsLoading(false);
  }

  async function handleCopyCode() {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setInviteCode(null);
        setError("");
        setCopied(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Invite Partner</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite to {groupName}</DialogTitle>
          <DialogDescription>
            Generate an invite code for your partner to join this couple.
          </DialogDescription>
        </DialogHeader>

        {!inviteCode ? (
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              onClick={handleGenerateInvite}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate Invite Code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Invite Code</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteCode}
                  readOnly
                  className="font-mono text-lg text-center tracking-wider"
                />
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code with your partner. It expires in 7 days.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
