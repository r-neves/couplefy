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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateGroupNameFromClient,
  removeMemberFromGroupFromClient,
  generateInviteFromClient,
} from "@/app/dashboard/actions/groups";
import { Settings, Users, UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface ManageGroupDialogProps {
  groupId: string;
  groupName: string;
  members: Member[];
  currentUserId: string;
  createdBy: string;
}

export function ManageGroupDialog({
  groupId,
  groupName,
  members,
  currentUserId,
  createdBy,
}: ManageGroupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Edit name state
  const [newGroupName, setNewGroupName] = useState(groupName);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // Invite state
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [copied, setCopied] = useState(false);

  // Remove member state
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingName(true);
    setNameError("");

    const result = await updateGroupNameFromClient(groupId, newGroupName);

    if (result.error) {
      setNameError(result.error);
    } else {
      router.refresh();
      setOpen(false);
    }

    setIsUpdatingName(false);
  }

  async function handleGenerateInvite() {
    setIsGeneratingInvite(true);
    setInviteError("");

    const result = await generateInviteFromClient(groupId);

    if (result.error) {
      setInviteError(result.error);
    } else if ("inviteCode" in result && result.inviteCode) {
      setInviteCode(result.inviteCode);
    }

    setIsGeneratingInvite(false);
  }

  async function handleCopyCode() {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    setRemovingMemberId(memberUserId);

    const result = await removeMemberFromGroupFromClient(groupId, memberUserId);

    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
      // If removing yourself, close the dialog
      if (memberUserId === currentUserId) {
        setOpen(false);
      }
    }

    setRemovingMemberId(null);
  }

  const isCreator = createdBy === currentUserId;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setNewGroupName(groupName);
          setNameError("");
          setInviteCode(null);
          setInviteError("");
          setCopied(false);
          setActiveTab("details");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Group</DialogTitle>
          <DialogDescription>
            Edit group details, manage members, and invite partners
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invite">Invite</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
                {nameError && (
                  <p className="text-sm text-destructive">{nameError}</p>
                )}
              </div>
              <Button type="submit" disabled={isUpdatingName || newGroupName === groupName}>
                {isUpdatingName ? "Updating..." : "Update Name"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Users className="h-4 w-4" />
                <span>Group Members ({members.length})</span>
              </div>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  {member.userId !== createdBy && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={removingMemberId === member.userId}
                    >
                      <UserMinus className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  )}
                  {member.userId === createdBy && (
                    <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                      Creator
                    </span>
                  )}
                </div>
              ))}
              {members.length > 1 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Note: The group creator cannot be removed while other members exist.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <UserPlus className="h-4 w-4" />
              <span>Invite Partner</span>
            </div>
            {!inviteCode ? (
              <div className="space-y-4">
                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}
                <Button
                  onClick={handleGenerateInvite}
                  disabled={isGeneratingInvite}
                  className="w-full"
                >
                  {isGeneratingInvite ? "Generating..." : "Generate Invite Code"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteCode}
                      readOnly
                      className="font-mono text-lg text-center tracking-wider"
                    />
                    <Button onClick={handleCopyCode} variant="outline">
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code with your partner. It expires in 7 days.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
