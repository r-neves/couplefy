import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { DashboardData } from "@/components/dashboard/dashboard-data";
import { DashboardStatsSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default async function DashboardPage() {
  // Start warming up the database connection in parallel with Supabase auth
  const { warmupPrismaConnection } = await import("@/lib/prisma");
  const warmupPromise = warmupPrismaConnection();

  // Get user from Supabase (runs in parallel with DB warmup)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Wait for DB warmup to complete before querying
  await warmupPromise;

  // Get current user's DB ID (connection should already be warm)
  const { getDbUserId } = await import("@/lib/utils/user");
  const userId = await getDbUserId(user.id);

  if (!userId) {
    redirect("/");
  }

  // Get current month's dates
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
      {/* Header - loads instantly */}
      <header className="border-b bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
              Couplefy
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-sm text-muted-foreground hidden sm:block truncate max-w-[150px] md:max-w-none">
                {user.email}
              </div>
              <ThemeToggle />
              <SettingsDialog />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome section - loads instantly */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0]}!
          </h2>
          <p className="text-muted-foreground">
            Manage your personal and shared life in one place.
          </p>
        </div>

        {/* Dashboard Data - streams in with loading state */}
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardData
            userId={userId}
            currentUserId={user.id}
            startOfMonth={startOfMonth}
            endOfMonth={endOfMonth}
          />
        </Suspense>
      </main>
    </div>
  );
}
