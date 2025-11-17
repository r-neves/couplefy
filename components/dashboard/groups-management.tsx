import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { AcceptInviteDialog } from "@/components/groups/accept-invite-dialog";
import { ManageGroupDialog } from "@/components/groups/manage-group-dialog";
import { Users } from "lucide-react";

interface GroupsManagementProps {
  userGroups: any[];
  currentUserId: string;
}

export function GroupsManagement({ userGroups, currentUserId }: GroupsManagementProps) {
  return (
    <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm hover:shadow-lg transition-shadow border-indigo-200 dark:border-indigo-800/50">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <CardTitle className="text-lg">Groups</CardTitle>
              <CardDescription>Manage your shared groups</CardDescription>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <AcceptInviteDialog trigger={<Button variant="outline" size="sm">Join</Button>} />
            <CreateGroupDialog trigger={<Button variant="outline" size="sm">+ New</Button>} />
          </div>
        </div>
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
                <ManageGroupDialog
                  groupId={group.id}
                  groupName={group.name}
                  members={group.members}
                  currentUserId={currentUserId}
                  createdBy={group.createdBy}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No groups yet. Create a group or join one with an invite code using the buttons above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
