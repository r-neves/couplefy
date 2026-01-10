import { createClient } from "@/lib/supabase/server";
import { getDbUserWithStatus } from "@/lib/utils/user";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const dbUser = await getDbUserWithStatus(user.id);

  if (!dbUser) {
    // User authenticated in Supabase but not in our DB?
    // This might happen during initial signup flow before webhook/sync
    // Or if the user doesn't exist.
    redirect("/");
  }

  if (dbUser.status !== "APPROVED") {
    redirect("/access/pending");
  }

  return <>{children}</>;
}
