import { supabase } from '@/lib/supabase';
import { Venue, Court, Booking, DisabledSlot, Profile, Subscription, Payment, Notification } from '@/types';
import { venueFromDB, bookingFromDB, disabledSlotFromDB } from '@/utils/adapters';

// ============================================
// HELPER: Upload Image to Supabase Storage
// ============================================
export const uploadImage = async (
    file: File,
    bucket: 'venue-images' | 'court-images',
    path: string
): Promise<string | null> => {
    try {
        console.log(`📤 Uploading image to ${bucket}/${path}`);

        // Upload file
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('❌ Upload error:', error);
            return null;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        console.log('✅ Image uploaded successfully:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('❌ Exception uploading image:', error);
        return null;
    }
};

// ============================================
// HELPER: Delete Image from Supabase Storage
// ============================================
export const deleteImage = async (
    bucket: 'venue-images' | 'court-images',
    path: string
): Promise<boolean> => {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.error('❌ Delete error:', error);
            return false;
        }

        console.log('✅ Image deleted successfully');
        return true;
    } catch (error) {
        console.error('❌ Exception deleting image:', error);
        return false;
    }
};

// ============================================
// PROFILES
// ============================================
export const getProfile = async (userId: string): Promise<Profile | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ Error fetching profile:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('❌ Exception fetching profile:', error);
        return null;
    }
};

export const updateProfile = async (
    userId: string,
    updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error('❌ Error updating profile:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception updating profile:', error);
        return false;
    }
};

// ============================================
// VENUES
// ============================================
export const getVenues = async (ownerId?: string): Promise<any[]> => {
    try {
        let query = supabase
            .from('venues')
            .select(`
                *,
                courts (*)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (ownerId) {
            query = query.eq('owner_id', ownerId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Error fetching venues:', error);
            return [];
        }

        // Convert to legacy format for component compatibility
        return (data || []).map(venueFromDB);
    } catch (error) {
        console.error('❌ Exception fetching venues:', error);
        return [];
    }
};

export const createVenue = async (
    venue: Omit<Venue, 'id' | 'courts' | 'created_at' | 'updated_at' | 'is_active'>,
    imageFile?: File
): Promise<string | null> => {
    try {
        let image_url = venue.image_url || null;

        // Upload image if provided
        if (imageFile) {
            const path = `${venue.owner_id}/${Date.now()}_${imageFile.name}`;
            const uploadedUrl = await uploadImage(imageFile, 'venue-images', path);
            image_url = uploadedUrl || null;
        }

        // Geocode address to get coordinates
        let latitude: number | null = null;
        let longitude: number | null = null;

        try {
            const { geocodeAddress } = await import('@/lib/geocoding');
            const coords = await geocodeAddress(venue.address);
            if (coords) {
                latitude = coords.lat;
                longitude = coords.lng;
            }
        } catch (error) {
            console.warn('⚠️ Geocoding failed:', error);
        }

        const { data, error } = await supabase
            .from('venues')
            .insert({
                owner_id: venue.owner_id,
                name: venue.name,
                address: venue.address,
                latitude,
                longitude,
                opening_hours: venue.opening_hours,
                amenities: venue.amenities,
                contact_info: venue.contact_info || null,
                image_url
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating venue:', error);
            return null;
        }

        return data.id;
    } catch (error) {
        console.error('❌ Exception creating venue:', error);
        return null;
    }
};

export const updateVenue = async (
    venueId: string,
    updates: Partial<Omit<Venue, 'id' | 'owner_id' | 'courts' | 'created_at' | 'updated_at'>>,
    imageFile?: File
): Promise<boolean> => {
    try {
        let image_url = updates.image_url || null;

        // Upload new image if provided
        if (imageFile) {
            const { data: venue } = await supabase
                .from('venues')
                .select('owner_id, image_url')
                .eq('id', venueId)
                .single();

            if (venue) {
                const path = `${venue.owner_id}/${Date.now()}_${imageFile.name}`;
                const uploadedUrl = await uploadImage(imageFile, 'venue-images', path);
                image_url = uploadedUrl || null;

                // Delete old image if exists
                if (venue.image_url) {
                    const oldPath = venue.image_url.split('/').slice(-2).join('/');
                    await deleteImage('venue-images', oldPath);
                }
            }
        }

        const { error } = await supabase
            .from('venues')
            .update({
                ...updates,
                image_url
            })
            .eq('id', venueId);

        if (error) {
            console.error('❌ Error updating venue:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception updating venue:', error);
        return false;
    }
};

export const deleteVenue = async (venueId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('venues')
            .delete()
            .eq('id', venueId);

        if (error) {
            console.error('❌ Error deleting venue:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception deleting venue:', error);
        return false;
    }
};

// ============================================
// COURTS
// ============================================
export const createCourt = async (
    court: Omit<Court, 'id' | 'created_at' | 'updated_at' | 'is_active'>,
    imageFile?: File
): Promise<boolean> => {
    try {
        let image_url = court.image_url || null;

        // Upload image if provided
        if (imageFile) {
            const path = `${court.venue_id}/${Date.now()}_${imageFile.name}`;
            const uploadedUrl = await uploadImage(imageFile, 'court-images', path);
            image_url = uploadedUrl || null;
        }

        const { error } = await supabase
            .from('courts')
            .insert({
                ...court,
                image_url
            });

        if (error) {
            console.error('❌ Error creating court:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception creating court:', error);
        return false;
    }
};

export const addCourts = async (
    venueId: string,
    courts: Omit<Court, 'id' | 'venue_id' | 'created_at' | 'updated_at' | 'is_active'>[]
): Promise<boolean> => {
    try {
        const courtsToInsert = courts.map(c => ({
            venue_id: venueId,
            name: c.name,
            type: c.type,
            price_per_hour: c.price_per_hour,
            image_url: c.image_url || null
        }));

        const { error } = await supabase
            .from('courts')
            .insert(courtsToInsert);

        if (error) {
            console.error('❌ Error adding courts:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception adding courts:', error);
        return false;
    }
};

export const deleteCourt = async (courtId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('courts')
            .delete()
            .eq('id', courtId);

        if (error) {
            console.error('❌ Error deleting court:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception deleting court:', error);
        return false;
    }
};

// ============================================
// BOOKINGS
// ============================================
export const getBookings = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                venues!inner(name),
                courts!inner(name, type),
                profiles!inner(full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching bookings:', error);
            return [];
        }

        // Convert to legacy format for component compatibility
        return (data || []).map(bookingFromDB);
    } catch (error) {
        console.error('❌ Exception fetching bookings:', error);
        return [];
    }
};

export const createBooking = async (
    booking: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'venue_name' | 'court_name' | 'court_type' | 'player_name'>
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('bookings')
            .insert(booking);

        if (error) {
            console.error('❌ Error creating booking:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception creating booking:', error);
        return false;
    }
};

export const cancelBooking = async (bookingId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'CANCELLED' })
            .eq('id', bookingId);

        if (error) {
            console.error('❌ Error cancelling booking:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception cancelling booking:', error);
        return false;
    }
};

export const deleteBooking = async (bookingId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId);

        if (error) {
            console.error('❌ Error deleting booking:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception deleting booking:', error);
        return false;
    }
};

// ============================================
// DISABLED SLOTS
// ============================================
export const getDisabledSlots = async (venueId: string, date: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('disabled_slots')
            .select('*')
            .eq('venue_id', venueId)
            .eq('date', date);

        if (error) {
            console.error('❌ Error fetching disabled slots:', error);
            return [];
        }

        // Convert to legacy format for component compatibility
        return (data || []).map(disabledSlotFromDB);
    } catch (error) {
        console.error('❌ Exception fetching disabled slots:', error);
        return [];
    }
};

export const toggleSlotAvailability = async (
    venueId: string,
    courtId: string,
    date: string,
    timeSlot: string,
    reason: string = ''
): Promise<boolean> => {
    try {
        // Check if slot is already disabled
        const { data: existing } = await supabase
            .from('disabled_slots')
            .select('id')
            .eq('court_id', courtId)
            .eq('date', date)
            .eq('time_slot', timeSlot)
            .single();

        if (existing) {
            // Enable slot (delete)
            const { error } = await supabase
                .from('disabled_slots')
                .delete()
                .eq('id', existing.id);

            if (error) {
                console.error('❌ Error enabling slot:', error);
                return false;
            }
        } else {
            // Disable slot (insert)
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return false;

            const { error } = await supabase
                .from('disabled_slots')
                .insert({
                    venue_id: venueId,
                    court_id: courtId,
                    date,
                    time_slot: timeSlot,
                    reason,
                    created_by: user.id
                });

            if (error) {
                console.error('❌ Error disabling slot:', error);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('❌ Exception toggling slot:', error);
        return false;
    }
};

// ============================================
// NOTIFICATIONS
// ============================================
export const getNotifications = async (userId: string): Promise<Notification[]> => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching notifications:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('❌ Exception fetching notifications:', error);
        return [];
    }
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('❌ Error marking notification as read:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception marking notification as read:', error);
        return false;
    }
};

// ============================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================

// Helper to convert new Venue to legacy format
export const venueToLegacy = (venue: Venue): any => ({
    id: venue.id,
    ownerId: venue.owner_id,
    name: venue.name,
    address: venue.address,
    imageUrl: venue.image_url || '',
    openingHours: venue.opening_hours,
    amenities: venue.amenities,
    contactInfo: venue.contact_info || '',
    latitude: venue.latitude,
    longitude: venue.longitude,
    courts: (venue.courts || []).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        pricePerHour: c.price_per_hour,
        imageUrl: c.image_url
    }))
});

// Wrapper for createVenue + addCourts
export const createVenueWithCourts = async (
    venue: any,
    courts: any[],
    imageFile?: File
): Promise<boolean> => {
    try {
        const venueId = await createVenue({
            owner_id: venue.ownerId,
            name: venue.name,
            address: venue.address,
            opening_hours: venue.openingHours,
            amenities: venue.amenities,
            contact_info: venue.contactInfo,
            image_url: venue.imageUrl
        }, imageFile);

        if (!venueId) return false;

        if (courts.length > 0) {
            const success = await addCourts(
                venueId,
                courts.map(c => ({
                    name: c.name,
                    type: c.type,
                    price_per_hour: c.pricePerHour || c.price_per_hour,
                    image_url: c.imageUrl || c.image_url
                }))
            );
            return success;
        }

        return true;
    } catch (error) {
        console.error('❌ Exception creating venue with courts:', error);
        return false;
    }
};

// ============================================
// LEGACY: uploadCourtImage (for AddCourtModal compatibility)
// ============================================
export const uploadCourtImage = async (file: File, courtId: string): Promise<string | null> => {
    const path = `${courtId}_${Date.now()}_${file.name}`;
    return await uploadImage(file, 'court-images', path);
};

