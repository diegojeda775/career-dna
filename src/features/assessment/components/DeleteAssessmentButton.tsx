"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAssessment } from "../actions";

export function DeleteAssessmentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Delete this assessment"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this assessment and its results? This can't be undone.")) return;
        startTransition(async () => {
          try {
            await deleteAssessment(id);
            toast.success("Deleted");
          } catch {
            toast.error("Couldn't delete it");
          }
        });
      }}
    >
      <Trash2 />
    </Button>
  );
}
