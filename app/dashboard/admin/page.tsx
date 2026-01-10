import { createClient } from "@/lib/supabase/server";
import { getDbUserWithStatus } from "@/lib/utils/user";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserStatusActions } from "@/components/admin/user-status-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const dbUser = await getDbUserWithStatus(user.id);

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.users.findMany({
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user access and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.status === "APPROVED"
                          ? "default" // Using default (usually primary color) for approved
                          : u.status === "REJECTED"
                          ? "destructive"
                          : "secondary" // Yellow/Orange-ish usually better, but secondary is safe
                      }
                      className={u.status === "PENDING" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell className="text-right">
                   {u.id !== dbUser.id && (
                      <UserStatusActions userId={u.id} currentStatus={u.status} />
                   )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
