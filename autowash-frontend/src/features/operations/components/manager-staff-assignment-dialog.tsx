import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";
import { getActiveStaffOptions, transferWashSession } from "@/features/operations/lib/operations-service";
import { useErrorMessage } from "@/shared/hooks/use-error-message";

type ManagerStaffAssignmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  currentStaffId?: string | null;
};

export function ManagerStaffAssignmentDialog({
  open,
  onOpenChange,
  sessionId,
  currentStaffId,
}: ManagerStaffAssignmentDialogProps) {
  const getErrorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSelectedStaffId(currentStaffId ?? "");
    }
  }, [open, currentStaffId]);

  const staffQuery = useQuery({
    queryKey: ["operations-staff-active"],
    queryFn: getActiveStaffOptions,
    enabled: open,
  });

  const transferMutation = useMutation({
    mutationFn: ({ toStaffId, reason }: { toStaffId: string; reason?: string }) =>
      transferWashSession(sessionId, toStaffId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["manager-operations"] });
      void queryClient.invalidateQueries({ queryKey: ["manager-staff"] });
      toast.success("Staff assignment updated.");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const staffOptions = staffQuery.data ?? [];
  const isLoading = staffQuery.isPending;
  const isAssigning = transferMutation.isPending;

  const handleAssign = () => {
    if (!selectedStaffId) {
      toast.error("Select a staff member.");
      return;
    }
    if (selectedStaffId === currentStaffId) {
      toast.error("This staff member is already assigned to this session.");
      return;
    }
    transferMutation.mutate({ toStaffId: selectedStaffId, reason: "Manager reassigned" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign staff</DialogTitle>
          <DialogDescription>
            Select the staff member responsible for this wash session.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#003cff]" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {staffOptions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No active staff members.</p>
              ) : (
                staffOptions.map((staff) => (
                  <button
                    key={staff.staffId}
                    type="button"
                    onClick={() => setSelectedStaffId(staff.staffId)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      selectedStaffId === staff.staffId
                        ? "border-[#003cff] bg-[#003cff]/5 ring-1 ring-[#003cff]"
                        : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        selectedStaffId === staff.staffId ? "bg-[#003cff] text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        <UserRound className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm text-slate-900">{staff.staffName}</span>
                    </div>
                    {currentStaffId === staff.staffId && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Assigned
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-slate-200"
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            className="rounded-xl bg-[#003cff] hover:bg-[#002fcc] text-white"
            disabled={!selectedStaffId || isAssigning || selectedStaffId === currentStaffId}
          >
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
