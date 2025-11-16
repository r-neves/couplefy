import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Sync user to our Prisma database
      try {
        const existingUser = await prisma.users.findUnique({
          where: { supabase_id: data.user.id },
        });

        if (!existingUser) {
          // Create new user in our database
          await prisma.users.create({
            data: {
              supabase_id: data.user.id,
              email: data.user.email!,
              name: data.user.user_metadata?.full_name || data.user.email!.split("@")[0],
              avatar_url: data.user.user_metadata?.avatar_url || null,
            },
          });
        } else {
          // Update existing user
          await prisma.users.update({
            where: { supabase_id: data.user.id },
            data: {
              email: data.user.email!,
              name: data.user.user_metadata?.full_name || existingUser.name,
              avatar_url: data.user.user_metadata?.avatar_url || existingUser.avatar_url,
              updated_at: new Date(),
            },
          });
        }
      } catch (dbError) {
        console.error("Error syncing user to database:", dbError);
        // Continue even if database sync fails - user is still authenticated
      }

      // Redirect to the next URL
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
