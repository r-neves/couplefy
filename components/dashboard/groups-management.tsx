import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { AcceptInviteDialog } from "@/components/groups/accept-invite-dialog";
import { InviteDialog } from "@/components/groups/invite-dialog";
import { Zap } from "lucide-react";

interface GroupsManagementProps {
  userGroups: any[];
}

export function GroupsManagement({ userGroups }: GroupsManagementProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Groups
        </CardTitle>
        <CardDescription>Manage your shared groups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {userGroups.length > 0 ? (
          <div className="space-y-2">
            {userGroups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <span className="text-sm font-medium">{group.name}</span>
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
