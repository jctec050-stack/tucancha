
export type SportType = 'Padel' | 'Beach Tennis';
export type UserRole = 'OWNER' | 'PLAYER';
export type BookingStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';

export interface Court {
  id: string;
  name: string;
  type: SportType;
  pricePerHour: number;
  address?: string;
  photos?: string[];
  imageUrl?: string;
}

export interface Venue {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  imageUrl: string;
  courts: Court[];
  openingHours: string; // e.g., "08:00 - 22:00"
  amenities: string[]; // e.g., ["Wifi", "Estacionamiento"]
  contactInfo: string; // e.g., "+595 991 123 456"
  latitude?: number;
  longitude?: number;
}

export interface Booking {
  id: string;
  venueId: string;
  courtId: string;
  courtName: string;
  courtType?: SportType;
  venueName: string;
  playerName: string;
  playerId?: string;
  date: string; // ISO format
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  price: number;
  status: BookingStatus;
  createdAt: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  userId: string;
  read: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthUser extends User {
  password: string; // In a real app, this would be hashed
}

export interface DisabledSlot {
  id: string;
  venueId: string;
  courtId: string;
  date: string;
  timeSlot: string;
  reason?: string;
}
