import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LockIcon } from "lucide-react";
import { signOut } from "@/app/auth/actions";

export default function AccessPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full w-fit mb-4">
            <LockIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Access Restricted</CardTitle>
          <CardDescription className="text-base mt-2">
            Your account is currently waiting for approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            This application is currently invite-only or requires administrator approval.
            Please contact an administrator to grant you access.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <Button variant="outline" className="w-full">
                Sign out to use a different account
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
