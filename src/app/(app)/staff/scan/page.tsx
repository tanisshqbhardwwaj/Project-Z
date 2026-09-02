"use client";

import { StaffAttendanceScanner } from "@/components/staff/staff-attendance-scanner";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffScanPage() {
  return (
    <PageContainer>
      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Scan staff barcode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scan a staff attendance barcode to check in or check out. First scan
            checks in automatically; second scan asks to check out.
          </p>
          <StaffAttendanceScanner label="Open scanner" className="h-12 px-6" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
