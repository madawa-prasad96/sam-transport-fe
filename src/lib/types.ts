export type UserRole = 'ORG_ADMIN' | 'UNIT_ADMIN' | 'UNIT_USER';
export type UserStatus = 'INVITED' | 'ACTIVE' | 'DEACTIVATED';
export type UnitStatus = 'ACTIVE' | 'INACTIVE';

export type InquiryStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VEHICLE_PROVIDED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'COMPLETED';

export type Priority = 'NORMAL' | 'URGENT';
export type WeightUom = 'KG' | 'LB';
export type RecipientType = 'TO' | 'CC' | 'BCC';

export const VEHICLE_TYPES = [
  'VAN',
  'LORRY_SMALL',
  'LORRY_MEDIUM',
  'LORRY_LARGE',
  'FLATBED',
  'TRAILER',
  'CONTAINER_20',
  'CONTAINER_40',
  'REEFER',
  'OTHER',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const PACKAGING_TYPES = [
  'PALLET',
  'CARTON',
  'CRATE',
  'DRUM',
  'BAG',
  'LOOSE',
  'CONTAINER',
  'OTHER',
] as const;
export type PackagingType = (typeof PACKAGING_TYPES)[number];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** Every user belongs to a unit, org admins included. */
  unitId: string;
}

export interface Unit {
  id: string;
  name: string;
  registrationNumber?: string | null;
  addressLine: string;
  country: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  code: string;
  timezone: string;
  defaultWeightUom: WeightUom;
  status: UnitStatus;
  createdAt: string;
  _count?: {
    users: number;
    requestedInquiries: number;
    providedInquiries: number;
  };
}

export interface UnitRef {
  id: string;
  name: string;
  code: string;
}

export interface OrgUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  notificationPreference: 'INSTANT' | 'DAILY_DIGEST';
  unitId: string;
  unit?: UnitRef;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface VehicleDetail {
  id: string;
  version: number;
  vehicleNumber: string;
  vehicleType: VehicleType;
  transporterName?: string | null;
  driverName: string;
  driverPhone: string;
  expectedPickupAt: string;
  notes?: string | null;
  createdAt: string;
  createdBy?: { id: string; fullName: string };
}

export interface Recipient {
  id: string;
  type: RecipientType;
  kind: 'USER' | 'EXTERNAL';
  email: string;
  name?: string | null;
  addedByUnitId: string;
  addedByUserId?: string | null;
}

export interface InquirySummary {
  id: string;
  number: string;
  status: InquiryStatus;
  priority: Priority;
  pickupLocation: string;
  deliveryLocation: string;
  cargoDescription: string;
  readyByAt: string;
  requiredByAt: string;
  referenceNumber?: string | null;
  requesterUnitId: string;
  providerUnitId: string;
  createdAt: string;
  requesterUnit: { id: string; name: string };
  providerUnit: { id: string; name: string };
  createdBy: { id: string; fullName: string };
  vehicleDetails: VehicleDetail[];
}

export interface Inquiry extends InquirySummary {
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  packageCount: number;
  grossWeight: string | number;
  weightUom: WeightUom;
  volumeCbm?: string | number | null;
  dimensions?: string | null;
  packagingType?: PackagingType | null;
  requestedVehicleType?: VehicleType | null;
  specialHandlingNotes?: string | null;
  declineReason?: string | null;
  subjectLine: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  recipients: Recipient[];
}

export interface TimelineEvent {
  id: string;
  type: string;
  actorName: string;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  source: 'APP' | 'EMAIL';
  isExternal: boolean;
  authorName?: string | null;
  authorEmail?: string | null;
  createdAt: string;
  author?: { id: string; fullName: string; unitId: string } | null;
}

export interface EmailLogEntry {
  id: string;
  eventType: string;
  subject: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'BOUNCED' | 'COMPLAINED' | 'FAILED';
  attempts: number;
  lastError?: string | null;
  messageId: string;
  sentAt?: string | null;
  createdAt: string;
  recipients: { type: RecipientType; email: string; status: string }[];
}

export interface QuarantineItem {
  id: string;
  fromAddress: string;
  fromName?: string | null;
  subject?: string | null;
  bodyText: string;
  quarantineReason?: string | null;
  receivedAt: string;
  inquiry?: { id: string; number: string; subjectLine: string } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
