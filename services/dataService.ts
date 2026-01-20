import { supabase } from '@/lib/supabase';
import { Venue, Court, Booking } from '@/types';

// Venues & Courts
export const getVenues = async (): Promise<Venue[]> => {
    const { data: venues, error } = await supabase
        .from('venues')
        .select(`
      *,
      courts (*)
    `);

    if (error) {
        console.error('Error fetching venues:', error);
        return [];
    }

    // Map database response to Venue type
    return venues.map((v: any) => ({
        id: v.id,
        ownerId: v.owner_id,
        name: v.name,
        address: v.address,
        imageUrl: v.image_url,
        openingHours: v.opening_hours,
        amenities: v.amenities,
        contactInfo: v.contact_info,
        courts: v.courts.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            pricePerHour: c.price_per_hour
        }))
    }));
};

export const createVenueWithCourts = async (
    venue: Omit<Venue, 'id' | 'courts'>,
    courts: Omit<Court, 'id'>[]
): Promise<boolean> => {
    // 1. Insert Venue
    const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .insert({
            owner_id: venue.ownerId,
            name: venue.name,
            address: venue.address,
            image_url: venue.imageUrl,
            opening_hours: venue.openingHours,
            amenities: venue.amenities,
            contact_info: venue.contactInfo
        })
        .select()
        .single();

    if (venueError || !venueData) {
        console.error('Error creating venue:', venueError);
        return false;
    }

    // 2. Insert Courts
    const courtsToInsert = courts.map(c => ({
        venue_id: venueData.id,
        name: c.name,
        type: c.type,
        price_per_hour: c.pricePerHour
    }));

    const { error: courtsError } = await supabase
        .from('courts')
        .insert(courtsToInsert);

    if (courtsError) {
        console.error('Error creating courts:', courtsError);
        return false;
    }

    return true;
};

// Bookings
export const getBookings = async (): Promise<Booking[]> => {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
      *,
      venue:venues(name),
      court:courts(name),
      player:profiles(full_name)
    `);

    if (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }

    return bookings.map((b: any) => ({
        id: b.id,
        venueId: b.venue_id,
        courtId: b.court_id,
        venueName: b.venue?.name || 'Unknown',
        courtName: b.court?.name || 'Unknown',
        playerName: b.player?.full_name || 'Usuario',
        date: b.date,
        startTime: b.start_time,
        endTime: b.end_time,
        price: b.price,
        status: b.status,
        createdAt: new Date(b.created_at).getTime()
    }));
};

export const createBooking = async (
    booking: Omit<Booking, 'id' | 'createdAt' | 'venueName' | 'courtName' | 'playerName'>
): Promise<boolean> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    const { error } = await supabase
        .from('bookings')
        .insert({
            venue_id: booking.venueId,
            court_id: booking.courtId,
            player_id: user.id,
            date: booking.date,
            start_time: booking.startTime,
            end_time: booking.endTime,
            price: booking.price,
            status: 'ACTIVE'
        });

    if (error) {
        console.error('Error creating booking:', error);
        return false;
    }
    return true;
};
