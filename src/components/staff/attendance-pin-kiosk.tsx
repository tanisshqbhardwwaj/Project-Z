"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePinCheckIn } from "@/hooks/queries/use-staff";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

export function AttendancePinKiosk({ date }: { date: string }) {
  const [pin, setPin] = useState("");
  const mutation = usePinCheckIn(date);
  const { toast } = useToast();

  async function submit() {
    if (pin.length < 4) return;
    try {
      await mutation.mutateAsync(pin);
      setPin("");
      toast({
        title: "Checked in",
        description: "Attendance marked present for today.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Check-in failed",
        description: err instanceof Error ? err.message : "Invalid PIN or location",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          PIN check-in kiosk
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Staff enter their 4–6 digit PIN at the counter. Set PINs on each profile under People.
        </p>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter PIN"
          className="h-11 rounded-xl font-mono tracking-widest"
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        <Button
          className="h-11 shrink-0 rounded-xl px-5"
          disabled={pin.length < 4 || mutation.isPending}
          onClick={() => void submit()}
        >
          {mutation.isPending ? "…" : "Check in"}
        </Button>
      </CardContent>
    </Card>
  );
}
