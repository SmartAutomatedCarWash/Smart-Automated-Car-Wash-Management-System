"use client";

import { useRouter } from "next/navigation";
import { CarFront, Loader2, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent } from "@/shared/ui/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/ui/dropdown-menu";
import { useErrorMessage } from "@/shared/hooks/use-error-message";
import type { CustomerVehicleListItem } from "@/entities/vehicles";
import { useDeleteCustomerVehicle, useSetPrimaryCustomerVehicle } from "@/features/vehicles/hooks/use-customer-vehicles";
import { getVehicleDisplayColor, getVehicleDisplayName } from "@/features/vehicles/lib/vehicle-display";
import { getVehicleToastErrorMessage, showVehicleAlert, VEHICLE_TOAST_OPTIONS } from "@/features/vehicles/lib/vehicle-toast";
import { translate } from "@/shared/store/language.store";
import { cn } from "@/shared/lib/utils";

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
  const getErrorMessage = useErrorMessage();
  const setPrimaryMutation = useSetPrimaryCustomerVehicle(vehicle.vehicleId);
  const deleteMutation = useDeleteCustomerVehicle(vehicle.vehicleId);
  const vehicleDisplayName = getVehicleDisplayName(vehicle, language);

  const handleOpenVehicleDetail = () => {
    router.push(`/customer/vehicles/${vehicle.vehicleId}`);
  };

  const handleSetPrimary = async () => {
    try {
      await setPrimaryMutation.mutateAsync();
      await showVehicleAlert({
        icon: "success",
        title: translate(language, "Da cap nhat xe chinh!", "Primary vehicle updated!"),
        message: translate(language, "Xe uu tien cua ban da duoc thay doi.", "Your primary vehicle has been updated."),
      });
    } catch (error) {
      await showVehicleAlert({
        icon: "error",
        title: translate(language, "Khong the cap nhat xe chinh.", "Unable to update primary vehicle."),
        message: getVehicleToastErrorMessage(
          error,
          translate(language, "Khong the cap nhat xe chinh.", "Unable to update primary vehicle."),
          getErrorMessage,
        ),
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success(translate(language, "Xe da duoc xoa.", "Vehicle removed."), VEHICLE_TOAST_OPTIONS);
      onDeleteChange(null);
    } catch (error) {
      toast.error(
        getVehicleToastErrorMessage(
          error,
          translate(language, "Khong the xoa xe.", "Unable to delete vehicle."),
          getErrorMessage,
        ),
        VEHICLE_TOAST_OPTIONS,
      );
    }
  };

  return (
    <Card
      role="link"
      tabIndex={0}
      className={cn(
        "border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition",
        "hover:border-cyan-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60",
      )}
      onClick={handleOpenVehicleDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpenVehicleDetail();
        }
      }}
    >
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
              {vehicleDisplayName}
            </div>
            <div className="text-sm text-slate-500">
              {translate(language, "Mau sac", "Color")}: {getVehicleDisplayColor(vehicle.color, language)}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap items-start gap-2 lg:justify-end">
            {isDeleting ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-xl"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete();
                  }}
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
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteChange(null);
                  }}
                >
                  {translate(language, "Huy", "Cancel")}
                </Button>
              </>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  {translate(language, "Tuy chon", "More")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="cursor-pointer"
                  disabled={vehicle.isPrimary || setPrimaryMutation.isPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleSetPrimary();
                  }}
                >
                  <Star className="mr-2 h-4 w-4" />
                  {setPrimaryMutation.isPending
                    ? translate(language, "Dang cap nhat...", "Updating...")
                    : vehicle.isPrimary
                      ? translate(language, "Xe chinh", "Primary")
                      : translate(language, "Dat lam xe chinh", "Set primary")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-rose-600 focus:text-rose-600"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteChange(vehicle.vehicleId);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {translate(language, "Xoa", "Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
