// src/types/index.ts

export type UserRole = 'homeowner' | 'provider' | 'employee' | 'admin';

/** A user as the admin console lists them. */
export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  itemCount: number;
  createdAt: string;
}

/** A default the admin manages centrally. Distinct from MaintenanceTemplate,
 *  which is the built-in starter list used when adding an item. */
export interface AdminTemplate {
  id: string;
  name: string;
  category: MaintenanceCategory;
  defaultFrequency: ServiceFrequency;
  active: boolean;
  createdAt: string;
}

export type ServiceFrequency =
  | 'monthly'
  | 'every_3_months'
  | 'every_6_months'
  | 'yearly'
  | 'custom';

export type MaintenanceStatus = 'upcoming' | 'due_soon' | 'overdue' | 'completed';

export type MaintenanceCategory =
  | 'ac'
  | 'water_filter'
  | 'water_tank'
  | 'smoke_detector'
  | 'fire_extinguisher'
  | 'water_heater'
  | 'custom';

export interface MaintenanceItem {
  id: string;
  userId: string;
  name: string;
  category: MaintenanceCategory;
  frequency: ServiceFrequency;
  customFrequencyDays?: number | null;
  lastServiceDate: string | null; // ISO date string
  nextServiceDate: string; // ISO date string
  notes?: string;
  notificationIds?: string[]; // scheduled local notification identifiers
  /** Which saved location this appliance lives at (id from savedLocations). */
  locationId?: string | null;
  /** Set when this task came from a booking, mirroring that booking's state. */
  bookingStatus?: BookingStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  maintenanceItemId: string;
  completedDate: string; // ISO date string
  notes?: string;
  createdAt: string;
}

export interface MaintenanceTemplate {
  category: MaintenanceCategory;
  itemName: string;
  taskName: string;
  frequency: ServiceFrequency;
}

export interface DashboardSummary {
  total: number;
  upcoming: number;
  dueSoon: number;
  overdue: number;
  completedThisMonth: number;
  onTrack: number;
}

export type ServiceRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed';

export type EmployeePrivilege = 'worker' | 'manager';

// Mirrors the service-request lifecycle so a provider can move a booking
// through the same stages from their Requests tab.
export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'declined'
  | 'completed';

export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  customerId: string;
  customerName: string;
  category: MaintenanceCategory;
  date: string; // 'YYYY-MM-DD'
  timeSlot: string; // e.g. '10:00'
  description: string;
  /** What the customer calls this unit, e.g. "Living room AC". */
  applianceName?: string;
  /** The maintenance item created alongside this booking. */
  maintenanceItemId?: string | null;
  /** Which of the customer's saved locations this job is at. */
  locationId?: string | null;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
  status: BookingStatus;
  createdAt: string;
}

// A provider's booking availability configuration.
export interface ProviderAvailability {
  startHour: number; // 0-23, e.g. 9
  endHour: number; // 0-23, e.g. 18
  slotMinutes: number; // 30, 60, 90, 120
  blockedDates: string[]; // 'YYYY-MM-DD' the provider marked unavailable
}

export interface Employee {
  uid: string;
  name: string;
  email: string;
  privilege: EmployeePrivilege;
  providerId: string;
  providerName: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  homeownerId: string;
  homeownerName: string;
  providerId: string;
  providerName: string;
  maintenanceItemId: string | null;
  serviceType: string; // task/service name, e.g. "AC Filter Cleaning"
  category: MaintenanceCategory;
  status: ServiceRequestStatus;
  notes?: string;
  preferredDate?: string | null; // ISO date
  isEmergency?: boolean;
  appliances?: string[]; // appliance ids the homeowner needs fixed
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// A public-facing provider profile a homeowner can pick from.
/** A pinned map location with an optional written address. */
export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

/** Maximum saved locations a homeowner may keep. */
export const MAX_SAVED_LOCATIONS = 5;

/** A named place a homeowner has saved (Home, Chalet, Office…). */
export interface SavedLocation {
  id: string;
  label: string; // what the user calls it
  lat: number;
  lng: number;
  address?: string;
  area: string; // area id, drives provider matching
  isDefault?: boolean;
}

export interface ProviderProfile {
  uid: string;
  name: string;
  category?: string;
  description?: string;
  appliances?: string[]; // appliance ids this provider fixes
  otherAppliance?: string; // free-text when 'other' is selected
  address?: string; // provider's own base address
  serviceAreas?: string[]; // area ids they are willing to work in
  location?: GeoLocation | null; // pinned base location
  rating?: { averageStars: number; averageScore: number; count: number } | null;
}

// ---------------- Reviews ----------------

/** What kind of job is being reviewed. */
export type ReviewSource = 'request' | 'booking';

/** A homeowner's review of a completed job. */
export interface Review {
  id: string;
  providerId: string;
  providerName: string;
  homeownerId: string;
  homeownerName: string;
  /** The completed request/booking this review belongs to. */
  jobId: string;
  jobType: ReviewSource;
  serviceName: string;
  stars: number; // 1-5 — the only rating the user gives
  comment?: string;
  /** When the service was performed (links a review to one visit). */
  servicedDate?: string;
  createdAt: string;
}

/** Aggregate rating shown on a provider's profile and used for sorting. */
export interface ProviderRating {
  averageStars: number;
  /** Derived from stars (stars x 2) so we can show an out-of-10 figure. */
  averageScore: number;
  count: number;
}
