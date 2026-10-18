"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ServiceFilterSelect({
  services,
  selectedService = "",
  currentStatus = "active",
}: {
  services: { id: string; name: string }[];
  selectedService?: string;
  currentStatus?: string;
}) {
  const router = useRouter();

  const handleValueChange = (val: string) => {
    const serviceParam = val === "all" ? "" : val;
    const url = `/app/incidents?status=${currentStatus}${
      serviceParam ? `&service=${serviceParam}` : ""
    }`;
    router.push(url);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-(--fg-muted)">Service:</span>
      <Select
        value={selectedService || "all"}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs font-mono bg-(--surface) border-(--line) text-(--fg)">
          <SelectValue placeholder="All Services" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">All Services</SelectItem>
          {services.map((svc) => (
            <SelectItem key={svc.id} value={svc.id}>
              {svc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
