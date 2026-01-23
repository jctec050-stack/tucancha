import { Venue, Court, Booking, DisabledSlot } from '@/types';

/**
 * Adapter functions to convert between database format (snake_case)
 * and legacy component format (camelCase)
 */

// ============================================
// VENUE ADAPTERS
// ============================================
export const venueFromDB = (dbVenue: any): any => ({
    id: dbVenue.id,
    ownerId: dbVenue.owner_id,
    name: dbVenue.name,
    address: dbVenue.address,
    imageUrl: dbVenue.image_url || '',
    openingHours: dbVenue.opening_hours,
    amenities: dbVenue.amenities || [],
    contactInfo: dbVenue.contact_info || '',
    latitude: dbVenue.latitude,
    longitude: dbVenue.longitude,
    courts: (dbVenue.courts || []).map(courtFromDB)
});

export const venueToDB = (venue: any): Partial<Venue> => ({
    owner_id: venue.ownerId,
    name: venue.name,
    address: venue.address,
    image_url: venue.imageUrl,
    opening_hours: venue.openingHours,
    amenities: venue.amenities,
    contact_info: venue.contactInfo
});

// ============================================
// COURT ADAPTERS
// ============================================
export const courtFromDB = (dbCourt: any): any => ({
    id: dbCourt.id,
    name: dbCourt.name,
    type: dbCourt.type,
    pricePerHour: dbCourt.price_per_hour,
    imageUrl: dbCourt.image_url,
    address: dbCourt.address // For legacy compatibility
});

export const courtToDB = (court: any, venueId?: string): Partial<Court> => ({
    venue_id: venueId,
    name: court.name,
    type: court.type,
    price_per_hour: court.pricePerHour,
    image_url: court.imageUrl
});

// ============================================
// BOOKING ADAPTERS
// ============================================
export const bookingFromDB = (dbBooking: any): any => ({
    id: dbBooking.id,
    venueId: dbBooking.venue_id,
    courtId: dbBooking.court_id,
    playerId: dbBooking.player_id,
    date: dbBooking.date,
    startTime: dbBooking.start_time?.substring(0, 5) || dbBooking.start_time, // HH:mm
    endTime: dbBooking.end_time?.substring(0, 5) || dbBooking.end_time, // HH:mm
    price: dbBooking.price,
    status: dbBooking.status,
    createdAt: new Date(dbBooking.created_at).getTime(),
    // Populated fields
    venueName: dbBooking.venue_name || dbBooking.venues?.name || '',
    courtName: dbBooking.court_name || dbBooking.courts?.name || '',
    courtType: dbBooking.court_type || dbBooking.courts?.type,
    playerName: dbBooking.player_name || dbBooking.profiles?.full_name || ''
});

export const bookingToDB = (booking: any): Partial<Booking> => ({
    venue_id: booking.venueId,
    court_id: booking.courtId,
    player_id: booking.playerId,
    date: booking.date,
    start_time: booking.startTime,
    end_time: booking.endTime,
    price: booking.price,
    status: booking.status,
    payment_status: 'PENDING',
    payment_method: 'CASH'
});

// ============================================
// DISABLED SLOT ADAPTERS
// ============================================
export const disabledSlotFromDB = (dbSlot: any): any => ({
    id: dbSlot.id,
    venueId: dbSlot.venue_id,
    courtId: dbSlot.court_id,
    date: dbSlot.date,
    timeSlot: dbSlot.time_slot?.substring(0, 5) || dbSlot.time_slot, // HH:mm
    reason: dbSlot.reason
});

export const disabledSlotToDB = (slot: any): Partial<DisabledSlot> => ({
    venue_id: slot.venueId,
    court_id: slot.courtId,
    date: slot.date,
    time_slot: slot.timeSlot,
    reason: slot.reason,
    created_by: slot.createdBy
});
