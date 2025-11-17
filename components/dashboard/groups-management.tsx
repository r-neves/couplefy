import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { AcceptInviteDialog } from "@/components/groups/accept-invite-dialog";
import { InviteDialog } from "@/components/groups/invite-dialog";
import { Users } from "lucide-react";

interface GroupsManagementProps {
  userGroups: any[];
}

export function GroupsManagement({ userGroups }: GroupsManagementProps) {
  return (
    <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm hover:shadow-lg transition-shadow border-indigo-200 dark:border-indigo-800/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Groups
        </CardTitle>
        <CardDescription>Manage your shared groups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {userGroups.length > 0 ? (
          <div className="space-y-2">
            {userGroups.map(group => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/50"
              >
                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{group.name}</span>
                <InviteDialog
                  groupId={group.id}
                  groupName={group.name}
                />
              </div>
            ))}
            <CreateGroupDialog />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Create a group or join one with an invite code
            </p>
            <div className="flex gap-2">
              <CreateGroupDialog />
              <AcceptInviteDialog />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
