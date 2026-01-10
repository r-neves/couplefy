"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon, RotateCcw } from "lucide-react";
import { updateUserStatus } from "@/app/dashboard/admin/actions";
import { useState } from "react";

export function UserStatusActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: "APPROVED" | "PENDING" | "REJECTED";
}) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: "APPROVED" | "REJECTED" | "PENDING") => {
    setLoading(true);
    try {
      const result = await updateUserStatus(userId, newStatus);
      if (!result.success) {
        alert("Failed to update status");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === "APPROVED") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleStatusChange("REJECTED")}
        disabled={loading}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <XIcon className="w-4 h-4 mr-1" />
        Revoke
      </Button>
    );
  }

  if (currentStatus === "REJECTED") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleStatusChange("APPROVED")}
        disabled={loading}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        <RotateCcw className="w-4 h-4 mr-1" />
        Restore
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStatusChange("REJECTED")}
        disabled={loading}
        className="text-red-500 border-red-200 hover:bg-red-50"
      >
        <XIcon className="w-4 h-4" />
        <span className="sr-only">Reject</span>
      </Button>
      <Button
        size="sm"
        onClick={() => handleStatusChange("APPROVED")}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <CheckIcon className="w-4 h-4 mr-1" />
        Approve
      </Button>
    </div>
  );
}
