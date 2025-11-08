"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteSaving } from "@/app/dashboard/actions/savings";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteSavingDialogProps {
  savingId: string;
  savingDescription?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSavingDialog({
  savingId,
  savingDescription,
  open,
  onOpenChange
}: DeleteSavingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleDelete() {
    setIsLoading(true);
    setError("");

    const result = await deleteSaving(savingId);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      onOpenChange(false);
      setIsLoading(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Saving
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this saving? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {savingDescription && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Saving: <span className="font-medium text-foreground">{savingDescription}</span>
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
