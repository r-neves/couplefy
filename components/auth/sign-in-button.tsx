"use client";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/app/auth/actions";
import { useState } from "react";

export function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Error signing in:", error);
      setIsLoading(false);
    }
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {isLoading ? "Signing in..." : "Sign in with Google"}
    </Button>
  );
}
