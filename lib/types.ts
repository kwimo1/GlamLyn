export type ServiceCategoryId = "cheveux" | "beaute_bien_etre";
export type BookingStatus = "confirmed" | "completed" | "cancelled";
export type ReviewStatus = "pending" | "published" | "rejected";
export type MediaSection = "hero" | "gallery" | "instagram" | "reviews";
export type NotificationType =
  | "booking_confirmation"
  | "booking_reminder"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "review_request";

export interface ServiceCategory {
  id: ServiceCategoryId;
  label: string;
  description: string;
}

export interface ServiceItem {
  id: string;
  categoryId: ServiceCategoryId;
  name: string;
  description: string;
  priceDzd: number;
  durationMinutes: number;
  active: boolean;
  featured: boolean;
  order: number;
}

export interface OpeningHour {
  day: number;
  label: string;
  open: string | null;
  close: string | null;
}

export interface BusinessSettings {
  salonName: string;
  tagline: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  announcement: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  timezone: string;
  bookingLeadHours: number;
  selfServiceChangeHours: number;
  openingHours: OpeningHour[];
  closedDates: string[];
  loyaltyCopy: string;
  instagramHandle: string;
  googlePlaceLabel: string;
}

export interface MediaAsset {
  id: string;
  label: string;
  alt: string;
  section: MediaSection;
  src: string;
  kind: "seed" | "upload";
  order: number;
  uploadedAt: string;
  mimeType?: string;
  storagePath?: string;
}

export interface CustomerProfile {
  id: string;
  authUserId?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  points: number;
  hasAccount: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  customerId: string;
  serviceIds: string[];
  totalPriceDzd: number;
  totalDurationMinutes: number;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  source: "guest" | "account";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteReview {
  id: string;
  customerId: string;
  bookingId: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface GoogleReviewSnapshot {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  createdAt: string;
}

export interface InstagramReelItem {
  id: string;
  title: string;
  caption: string;
  coverAssetId?: string;
  externalCoverUrl?: string | null;
  reelUrl: string;
  published: boolean;
  order: number;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  active: boolean;
  lastLoginAt?: string | null;
}

export interface NotificationLog {
  id: string;
  type: NotificationType;
  channel: "email";
  recipient: string;
  subject: string;
  message: string;
  status: "sent" | "failed" | "skipped";
  provider: "resend" | "manual";
  createdAt: string;
  bookingId?: string | null;
  customerId?: string | null;
}

export interface CreateBookingInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  serviceIds: string[];
  date: string;
  time: string;
  createAccount?: boolean;
}

export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
  dateLabel: string;
  timeLabel: string;
}

export interface DashboardMetrics {
  bookingsThisWeek: number;
  cancellationsThisWeek: number;
  occupancyRate: number;
  newAccountsThisMonth: number;
  pendingReviews: number;
  topServices: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}
