
export type SportType = 'Padel' | 'Beach Tennis';
export type UserRole = 'OWNER' | 'PLAYER';
export type BookingStatus = 'ACTIVE' | 'CANCELLED';

export interface Court {
  id: string;
  name: string;
  type: SportType;
  pricePerHour: number;
}

export interface Venue {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  imageUrl: string;
  courts: Court[];
  openingHours: string; // e.g., "08:00 - 22:00"
}

export interface Booking {
  id: string;
  venueId: string;
  courtId: string;
  courtName: string;
  venueName: string;
  playerName: string;
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
