import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Car, CheckCircle2, Eye, Search, UserPlus } from "lucide-react";
import {
  fmtBookingMoney,
  STATUS_STYLES,
  useAvailableServices,
  useBookings,
} from "@/features/bookings/lib/booking-store";
import { NO_AVAILABLE_STAFF_MESSAGE } from "@/features/operations/lib/staff-availability";
import { Card } from "@/shared/ui/ui/card";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { Label } from "@/shared/ui/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select";
import { useCarwashStore } from "@/shared/store/carwash-store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/ui/dialog";

export function StaffDashboard() {
  const { bookings } = useBookings();
  const { prepareSessionForBooking, createWalkInBooking, staffAvailability } = useCarwashStore();
  const servicesCatalog = useAvailableServices();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const availableStaffCount = staffAvailability.filter(
    (staff) => staff.availability === "Available",
  ).length;
  const noAvailableStaff = availableStaffCount === 0;
  const filtered = bookings.filter(
    (booking) =>
      (booking.status === "Confirmed" || booking.status === "Pending") &&
      (booking.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
        booking.id.toLowerCase().includes(search.toLowerCase())),
  );

  const [plate, setPlate] = useState("");
  const [vType, setVType] = useState<"Sedan" | "SUV">("Sedan");
  const [serviceIds, setServiceIds] = useState<string[]>(
    servicesCatalog[0] ? [servicesCatalog[0].id] : [],
  );
  const detailBooking = bookings.find((booking) => booking.id === detailId) ?? null;

  const submitWalkIn = () => {
    if (submittingWalkIn) return;
    if (noAvailableStaff) {
      toast.warning(NO_AVAILABLE_STAFF_MESSAGE);
      return;
    }
    if (!plate.trim()) {
      toast.error("License plate required");
      return;
    }
    if (serviceIds.length === 0) {
      toast.error("Select at least one service");
      return;
    }

    try {
      setSubmittingWalkIn(true);
      const { id, staffName } = createWalkInBooking({ plate, vehicleType: vType, serviceIds });
      toast.success(`Walk-in ${id} checked in! Assigned to ${staffName}.`);
      setPlate("");
      setServiceIds(servicesCatalog[0] ? [servicesCatalog[0].id] : []);
      router.push("/staff/operations");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create walk-in booking.");
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3 items-start">
      <div className="lg:col-span-2">
        <Tabs defaultValue="arrivals" className="w-full animate-in fade-in duration-500">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-muted/40 p-1 border border-border/50 shadow-sm backdrop-blur-md">
            <TabsTrigger
              value="arrivals"
              className="rounded-lg font-bold data-[state=active]:shadow-sm"
            >
              Pre-booked Arrivals
            </TabsTrigger>
            <TabsTrigger
              value="walkin"
              className="rounded-lg font-bold data-[state=active]:shadow-sm"
            >
              Walk-in Registration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="arrivals" className="mt-6 space-y-6">
            {noAvailableStaff && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-500/10 p-4 text-sm font-semibold text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{NO_AVAILABLE_STAFF_MESSAGE}</span>
              </div>
            )}
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by license plate or booking ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl border-border/50 bg-card/60 backdrop-blur-sm shadow-sm transition-all focus:bg-background h-12"
              />
            </div>
            <Card className="overflow-hidden rounded-[1.5rem] border-border/50 bg-card/60 backdrop-blur-xl shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="text-left">
                      <th className="p-4 pl-6 font-bold uppercase tracking-wider text-xs border-b border-border/50">
                        Booking
                      </th>
                      <th className="p-4 font-bold uppercase tracking-wider text-xs border-b border-border/50">
                        Customer / Vehicle
                      </th>
                      <th className="p-4 font-bold uppercase tracking-wider text-xs border-b border-border/50">
                        Services
                      </th>
                      <th className="p-4 font-bold uppercase tracking-wider text-xs border-b border-border/50">
                        Time
                      </th>
                      <th className="p-4 font-bold uppercase tracking-wider text-xs border-b border-border/50">
                        Status
                      </th>
                      <th className="p-4 pr-6 text-right font-bold uppercase tracking-wider text-xs border-b border-border/50">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-16 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/50 shadow-inner">
                              <Search className="h-8 w-8 opacity-40" />
                            </div>
                            <div className="text-sm font-medium">No matching bookings.</div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {filtered.map((booking) => (
                      <tr key={booking.id} className="transition-colors hover:bg-primary/5 relative">
                        <td className="p-4 pl-6 font-mono font-bold text-muted-foreground">
                          #{booking.id}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-inner">
                              <Car className="h-5 w-5 text-primary/70" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-foreground">
                                  {booking.customerName ?? "Customer"}
                                </div>
                                {booking.customerPriorityScore ? booking.customerPriorityScore > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 shadow-sm ring-1 ring-inset ring-amber-500/20">
                                    ⭐ TIER {booking.customerTier} (Ưu tiên: {booking.customerPriorityScore === 30 ? "Cao" : booking.customerPriorityScore === 20 ? "Trung bình" : "Bình thường"})
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs font-medium text-muted-foreground">
                                {booking.vehicleName} / {booking.vehicleType}
                              </div>
                              <div className="text-xs font-mono font-medium text-primary">
                                {booking.vehiclePlate}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-medium">{booking.services.join(", ")}</td>
                        <td className="p-4 font-medium">{booking.scheduledAt}</td>
                        <td className="p-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold shadow-sm ${STATUS_STYLES[booking.status]}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailId(booking.id)}
                            className="mr-2 rounded-lg font-bold"
                          >
                            <Eye className="mr-1.5 h-4 w-4" /> View
                          </Button>
                          <Button
                            size="sm"
                            disabled={processingBookingId === booking.id || noAvailableStaff}
                            onClick={() => {
                              try {
                                setProcessingBookingId(booking.id);
                                const staffName = prepareSessionForBooking(booking.id);
                                toast.success(
                                  `${booking.id} checked in! Assigned to ${staffName}.`,
                                );
                                router.push("/staff/operations");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to check in booking.",
                                );
                              } finally {
                                setProcessingBookingId(null);
                              }
                            }}
                            className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 shadow-sm border border-emerald-500/20 rounded-lg font-bold transition-all"
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />{" "}
                            {processingBookingId === booking.id ? "Checking in..." : "Check-In"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="walkin" className="mt-6">
            {noAvailableStaff && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-500/10 p-4 text-sm font-semibold text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{NO_AVAILABLE_STAFF_MESSAGE}</span>
              </div>
            )}
            <Card className="max-w-2xl p-6 sm:p-8 rounded-[1.5rem] border-border/50 bg-card/60 backdrop-blur-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10">
                <div className="mb-8 flex items-center gap-3 border-b border-border/50 pb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-inner text-primary">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Khách vãng lai mới</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Đăng ký xe chưa có lịch đặt trước.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider">
                        License Plate
                      </Label>
                      <Input
                        placeholder="e.g. 51A-999.88"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value)}
                        className="rounded-xl border-border/50 bg-background/50 backdrop-blur-sm h-12 font-mono text-sm shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider">
                        Vehicle Type
                      </Label>
                      <Select
                        value={vType}
                        onValueChange={(value: "Sedan" | "SUV") => setVType(value)}
                      >
                        <SelectTrigger className="rounded-xl border-border/50 bg-background/50 backdrop-blur-sm h-12 font-medium shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50">
                          <SelectItem value="Sedan" className="rounded-lg font-medium">
                            Sedan
                          </SelectItem>
                          <SelectItem value="SUV" className="rounded-lg font-medium">
                            SUV
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider">
                      Select Services
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {servicesCatalog.map((service) => {
                        const active = serviceIds.includes(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() =>
                              setServiceIds((prev) =>
                                prev.includes(service.id)
                                  ? prev.filter((id) => id !== service.id)
                                  : [...prev, service.id],
                              )
                            }
                            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-300 ${
                              active
                                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                                : "border-border/50 bg-background/50 hover:border-primary/40 hover:bg-background"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-md border ${active ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}
                              >
                                {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                              </div>
                              <div className="font-bold">{service.name}</div>
                            </div>
                            <div className="text-sm font-semibold text-primary">
                              {fmtBookingMoney(service.price)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    onClick={submitWalkIn}
                    disabled={submittingWalkIn || noAvailableStaff}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all hover:shadow-lg h-12 text-base font-bold"
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />{" "}
                    {submittingWalkIn ? "Creating..." : "Create & Check-In"}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <div className="lg:col-span-1">
        <StaffLoadCard />
      </div>
      <Dialog open={!!detailId} onOpenChange={(open: boolean) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[1.5rem] border-border/50 bg-card/95 backdrop-blur-2xl">
          {detailBooking && (
            <>
              <DialogHeader>
                <DialogTitle>Booking #{detailBooking.id}</DialogTitle>
                <DialogDescription>
                  Full booking and vehicle information for staff check-in.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Customer" value={detailBooking.customerName ?? "Unknown"} />
                <Info label="Phone" value={detailBooking.customerPhone ?? "-"} />
                <Info label="Vehicle type" value={detailBooking.vehicleType} />
                <Info label="License plate" value={detailBooking.vehiclePlate} mono />
                <Info label="Service package" value={detailBooking.services.join(", ")} />
                <Info label="Booking time" value={detailBooking.scheduledAt} />
                <Info label="Status" value={detailBooking.status} />
                <Info label="Notes" value={detailBooking.notes || "None"} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StaffLoadCard() {
  const { staffAvailability } = useCarwashStore();

  return (
    <Card className="rounded-[1.5rem] border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Staff Schedule Load
      </h3>
      <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
        System automatically assigns check-ins to active staff members with the least schedule load
        (0 active sessions preferred).
      </p>
      <div className="space-y-4">
        {staffAvailability.map((staff) => (
          <div
            key={staff.id}
            className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-4 shadow-sm transition-all hover:bg-background/80"
          >
            <div>
              <div className="font-bold text-sm text-foreground">{staff.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                Staff ID: {staff.id}
              </div>
            </div>
            <div className="text-right">
              {staff.availability === "Available" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20 shadow-sm">
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-500/20 shadow-sm">
                  Busy
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-bold text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
