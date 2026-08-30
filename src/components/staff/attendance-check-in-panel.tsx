"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, LogIn, LogOut } from "lucide-react";
import { useSelfAttendanceCheckIn, type AttendanceCheckInRow } from "@/hooks/queries/use-staff";
import { useToast } from "@/hooks/use-toast";

type TodayAttendance = {
  date: string;
  status: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  geoVerified?: boolean | null;
};

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttendanceCheckInPanel({ today }: { today: TodayAttendance }) {
  const mutation = useSelfAttendanceCheckIn();
  const { toast } = useToast();

  const checkedIn = !!today.checkInAt && !today.checkOutAt;
  const done = !!today.checkInAt && !!today.checkOutAt;

  async function run(action: "check_in" | "check_out") {
    try {
      const row = (await mutation.mutateAsync(action)) as AttendanceCheckInRow;
      toast({
        title: action === "check_in" ? "Checked in" : "Checked out",
        description:
          action === "check_in"
            ? `Present at ${formatTime(row.checkInAt) ?? "now"}`
            : `Left at ${formatTime(row.checkOutAt) ?? "now"}`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Could not update attendance",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Today</CardTitle>
        <p className="text-xs text-muted-foreground">
          Check in with your location when you arrive at the shop.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border bg-muted/30 px-3 py-2 text-sm">
          <p className="font-medium capitalize">
            {today.status?.replace(/_/g, " ").toLowerCase() ?? "Not marked yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {today.checkInAt ? `In ${formatTime(today.checkInAt)}` : "No check-in"}
            {today.checkOutAt ? ` · Out ${formatTime(today.checkOutAt)}` : ""}
          </p>
          {today.geoVerified === true ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
              <MapPin className="h-3 w-3" />
              Location verified at check-in
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-11 rounded-xl"
            disabled={mutation.isPending || checkedIn || done}
            onClick={() => void run("check_in")}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Check in
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            disabled={mutation.isPending || !checkedIn}
            onClick={() => void run("check_out")}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Check out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
