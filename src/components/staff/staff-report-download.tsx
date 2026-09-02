"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiFetchBlob } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";

async function downloadReport(path: string, filename: string) {
  const blob = await apiFetchBlob(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function StaffAttendanceReportDownload({
  from,
  to,
  staffId,
}: {
  from: string;
  to: string;
  staffId?: string;
}) {
  const { toast } = useToast();

  async function run(format: "csv" | "pdf") {
    try {
      const params = new URLSearchParams({ from, to, format });
      if (staffId) params.set("staffId", staffId);
      await downloadReport(
        `/api/v1/staff/attendance/export?${params.toString()}`,
        `attendance-${from}-to-${to}.${format}`
      );
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-10 rounded-xl">
          <Download className="mr-2 h-4 w-4" />
          Download report
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-40 flex-col gap-1 p-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => void run("csv")}>
          CSV
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void run("pdf")}>
          PDF
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function StaffPayrollReportDownload({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const { toast } = useToast();
  const label = `${year}-${String(month).padStart(2, "0")}`;

  async function run(format: "csv" | "pdf") {
    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        format,
      });
      await downloadReport(
        `/api/v1/staff/payroll/export?${params.toString()}`,
        `payroll-${label}.${format}`
      );
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-10 rounded-xl">
          <Download className="mr-2 h-4 w-4" />
          Download report
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-40 flex-col gap-1 p-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => void run("csv")}>
          CSV
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void run("pdf")}>
          PDF
        </Button>
      </PopoverContent>
    </Popover>
  );
}
