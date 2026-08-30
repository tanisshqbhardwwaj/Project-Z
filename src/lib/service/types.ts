import type {
  AppointmentStatus,
  ContractBillingCycle,
  ContractStatus,
  ContractVisitStatus,
  FollowUpStatus,
  PackageStatus,
  ServicePackageType,
} from "@prisma/client";

export type ServiceAppointmentItem = {
  productId?: string;
  inventoryItemId?: string;
  name: string;
  durationMinutes?: number;
  pricePaise: number;
  quantity?: number;
};

export type {
  AppointmentStatus,
  ContractBillingCycle,
  ContractStatus,
  ContractVisitStatus,
  FollowUpStatus,
  PackageStatus,
  ServicePackageType,
};
