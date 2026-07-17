"use client";

import { useRouter } from "next/navigation";
import { CarFront, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent } from "@/shared/ui/ui/card";
import type { CustomerVehicleListItem } from "@/entities/vehicles";
import { useDeleteCustomerVehicle, useSetPrimaryCustomerVehicle } from "@/features/vehicles/hooks/use-customer-vehicles";
import { translate } from "@/shared/store/language.store";

export function CustomerVehicleListCard({
  vehicle,
  isDeleting,
  onDeleteChange,
  language,
}: {
  vehicle: CustomerVehicleListItem;
  isDeleting: boolean;
  onDeleteChange: (vehicleId: string | null) => void;
  language: "vi" | "en";
}) {
  const router = useRouter();
  const setPrimaryMutation = useSetPrimaryCustomerVehicle(vehicle.vehicleId);
  const deleteMutation = useDeleteCustomerVehicle(vehicle.vehicleId);

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync();
      toast.success(translate(language, "Xe chinh da duoc cap nhat.", "Primary vehicle updated."));
    } catch {
      toast.error(translate(language, "Khong the cap nhat xe chinh.", "Unable to update primary vehicle."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success(translate(language, "Xe da duoc xoa.", "Vehicle removed."));
      onDeleteChange(null);
    } catch {
      toast.error(translate(language, "Khong the xoa xe.", "Unable to delete vehicle."));
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <CarFront className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{vehicle.plate}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {vehicle.type}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {vehicle.status}
              </span>
              {vehicle.isPrimary ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  <Star className="mr-1 h-3.5 w-3.5" />
                  {translate(language, "Xe chinh", "Primary")}
                </span>
              ) : null}
            </div>
            <div className="text-sm text-slate-600">
              {vehicle.brand} {vehicle.model}
            </div>
            <div className="text-sm text-slate-500">
              {translate(language, "Mau sac", "Color")}: {vehicle.color ?? translate(language, "Chua cung cap", "Not provided")}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap items-start gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => router.push(`/customer/vehicles/${vehicle.vehicleId}`)}
            >
              {translate(language, "Xem chi tiet", "View details")}
            </Button>
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={handleSetPrimary}
                disabled={vehicle.isPrimary || setPrimaryMutation.isPending}
              >
                {setPrimaryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {translate(language, "Dang cap nhat...", "Updating...")}
                  </>
              ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    {vehicle.isPrimary ? translate(language, "Xe chinh", "Primary") : translate(language, "Dat lam xe chinh", "Set primary")}
                  </>
                )}
              </Button>
            </div>
            {isDeleting ? (
              <>
                <div className="flex flex-col items-start gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-xl"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {translate(language, "Dang xoa...", "Removing...")}
                      </>
                    ) : (
                      translate(language, "Xac nhan xoa", "Confirm delete")
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    onDeleteChange(null);
                  }}
                >
                  {translate(language, "Huy", "Cancel")}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl"
                onClick={() => {
                  onDeleteChange(vehicle.vehicleId);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {translate(language, "Xoa", "Delete")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
