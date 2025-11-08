import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { AcceptInviteDialog } from "@/components/groups/accept-invite-dialog";
import { InviteDialog } from "@/components/groups/invite-dialog";
import { getUserGroups } from "./actions/groups";
import { getExpenses } from "./actions/expenses";
import { getSavings } from "./actions/savings";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Get current month's dates
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get user's groups
  const groupsResult = await getUserGroups();
  const userGroups = groupsResult.success ? groupsResult.groups : [];

  // Get expenses and savings for current month
  const expensesResult = await getExpenses({ startDate: startOfMonth, endDate: endOfMonth });
  const expenses = expensesResult.success ? expensesResult.expenses : [];

  const savingsResult = await getSavings({ startDate: startOfMonth, endDate: endOfMonth });
  const savingsData = savingsResult.success ? savingsResult.savings : [];

  // Calculate totals
  const personalExpenses = expenses.filter(e => !e.groupId);
  const sharedExpenses = expenses.filter(e => e.groupId);
  const personalExpensesTotal = personalExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const sharedExpensesTotal = sharedExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const totalSavings = savingsData.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
      {/* Header */}
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
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0]}!
          </h2>
          <p className="text-muted-foreground">
            Manage your expenses and savings together
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/expenses">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Personal Expenses</CardTitle>
                <CardDescription>Track your personal spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${personalExpensesTotal.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground mt-2">This month</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/expenses">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Shared Expenses</CardTitle>
                <CardDescription>Track spending with your partner</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${sharedExpensesTotal.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground mt-2">This month</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/savings">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Savings</CardTitle>
                <CardDescription>Your savings progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${totalSavings.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground mt-2">Total saved</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Groups Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold">Your Groups</h3>
            <div className="flex gap-2">
              <CreateGroupDialog />
              <AcceptInviteDialog />
            </div>
          </div>

          {userGroups.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You haven't created or joined any groups yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create a new couple or join one using an invite code from your partner.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {userGroups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{group.name}</CardTitle>
                        <CardDescription>
                          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <InviteDialog groupId={group.id} groupName={group.name} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Members:</p>
                      <div className="space-y-1">
                        {group.members.map((member) => (
                          <div key={member.id} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>{member.user.name}</span>
                            {member.user.email === user.email && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Set up your Couplefy account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">1</div>
                <div>
                  <h3 className="font-semibold">Create or join a couple</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a new couple or accept an invitation from your partner
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">2</div>
                <div>
                  <h3 className="font-semibold">Set up categories</h3>
                  <p className="text-sm text-muted-foreground">
                    Create custom categories for your expenses and savings
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">3</div>
                <div>
                  <h3 className="font-semibold">Start tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your first expense or savings entry
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
