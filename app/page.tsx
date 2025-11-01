import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInButton } from "@/components/auth/sign-in-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
            Couplefy
          </CardTitle>
          <CardDescription className="text-lg pt-2">
            Manage your life together with tools designed for couples/groups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Starting with Expenses & Savings Tracker
          </div>
          <div className="flex flex-col gap-3">
            <SignInButton />
            <p className="text-xs text-center text-muted-foreground">
              Sign in to start tracking your expenses and savings together
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
