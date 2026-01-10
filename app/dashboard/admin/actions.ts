"use server";

import { createClient } from "@/lib/supabase/server";
import { getDbUserWithStatus } from "@/lib/utils/user";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateUserStatus(userId: string, newStatus: "APPROVED" | "REJECTED" | "PENDING") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const executor = await getDbUserWithStatus(user.id);

  if (!executor || executor.role !== "ADMIN") {
    throw new Error("Forbidden: You must be an admin to perform this action.");
  }

  try {
    await prisma.users.update({
      where: { id: userId },
      data: { status: newStatus },
    });
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user status:", error);
    return { success: false, error: "Failed to update user status" };
  }
}
