
export type SportType = 'Padel' | 'Beach Tennis' | 'Tenis' | 'Futbol 5' | 'Futbol 7';
export type UserRole = 'OWNER' | 'PLAYER' | 'ADMIN';
export type BookingStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'QR';
export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
export type NotificationType = 'BOOKING' | 'PAYMENT' | 'SYSTEM' | 'PROMOTION';

// ============================================
// PROFILE
// ============================================
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ============================================
// COURT
// ============================================
export interface Court {
  id: string;
  venue_id: string;
  name: string;
  type: SportType;
  price_per_hour: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Alias para compatibilidad con código existente
export interface CourtLegacy {
  id: string;
  name: string;
  type: SportType;
  pricePerHour: number;
  imageUrl?: string;
}

// ============================================
// VENUE
// ============================================
export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  opening_hours: string;
  amenities: string[];
  contact_info?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  courts: Court[]; // Populated via join
}

// Alias para compatibilidad con código existente
export interface VenueLegacy {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  imageUrl: string;
  courts: CourtLegacy[];
  openingHours: string;
  amenities: string[];
  contactInfo: string;
  latitude?: number;
  longitude?: number;
}

// ============================================
// BOOKING
// ============================================
export interface Booking {
  id: string;
  venue_id: string;
  court_id: string;
  player_id: string;
  date: string; // DATE format: YYYY-MM-DD
  start_time: string; // TIME format: HH:mm:ss
  end_time: string; // TIME format: HH:mm:ss
  price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Populated fields (from joins)
  venue_name?: string;
  court_name?: string;
  court_type?: SportType;
  player_name?: string;
}

// ============================================
// DISABLED SLOT
// ============================================
export interface DisabledSlot {
  id: string;
  venue_id: string;
  court_id: string;
  date: string; // DATE format: YYYY-MM-DD
  time_slot: string; // TIME format: HH:mm:ss
  reason?: string;
  created_by: string;
  created_at: string;
}

// ============================================
// SUBSCRIPTION
// ============================================
export interface Subscription {
  id: string;
  owner_id: string;
  plan_type: SubscriptionPlan;
  status: SubscriptionStatus;
  start_date: string; // DATE format: YYYY-MM-DD
  end_date?: string; // DATE format: YYYY-MM-DD
  price_per_month: number;
  max_venues: number;
  max_courts_per_venue: number;
  features?: Record<string, any>; // JSONB
  created_at: string;
  updated_at: string;
}

// ============================================
// PAYMENT
// ============================================
export interface Payment {
  id: string;
  payment_type: 'BOOKING' | 'SUBSCRIPTION';
  booking_id?: string;
  subscription_id?: string;
  payer_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transaction_id?: string;
  metadata?: Record<string, any>; // JSONB
  created_at: string;
  updated_at: string;
}

// ============================================
// NOTIFICATION
// ============================================
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  metadata?: Record<string, any>; // JSONB
  created_at: string;
}

// ============================================
// PLATFORM REVENUE (Admin View)
// ============================================
export interface PlatformRevenue {
  venue_id: string;
  venue_name: string;
  owner_id: string;
  owner_name: string;
  total_bookings: number;
  total_revenue: number;
  platform_commission: number; // 10% de total_revenue
  month: string; // Truncated to month
}

// ============================================
// USER (Auth)
// ============================================
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthUser extends User {
  password: string; // In a real app, this would be hashed
}
