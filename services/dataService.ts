import { supabase } from '@/lib/supabase';
import { Venue, Court, Booking, DisabledSlot, Profile } from '@/types';

// NOTE: Removed legacy adapters import. 
// We now map directly to snake_case matching types.ts and DB.

// ============================================
// HELPER: Upload Image to Supabase Storage
// ============================================
export const uploadImage = async (
    file: File,
    bucket: 'venue-images' | 'court-images' | 'court-photos',
    path: string
): Promise<string | null> => {
    try {
        console.log(`📤 Uploading image to ${bucket}/${path}`);
        console.log(`ℹ️ File details: type=${file.type}, size=${file.size} bytes`);

        // Create a timeout promise (15 seconds)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Upload request timed out (15s)')), 15000)
        );

        // Upload file with race against timeout
        const uploadPromise = supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });

        const result: any = await Promise.race([uploadPromise, timeoutPromise]);

        const { data, error } = result;

        if (error) {
            console.error('❌ Upload error details:', error);
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
// VENUES
// ============================================

export const getVenues = async (ownerId?: string): Promise<Venue[]> => {
    if (ownerId) return getOwnerVenues(ownerId);

    try {
        const { data, error } = await supabase
            .from('venues')
            .select(`*, courts (*)`)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        // Return raw snake_case data (Types match interface)
        return data as Venue[];
    } catch (error) {
        console.error('❌ Error fetching venues:', error);
        return [];
    }
};

export const getOwnerVenues = async (ownerId: string): Promise<Venue[]> => {
    if (!ownerId) {
        console.error('❌ getOwnerVenues called without ownerId');
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('venues')
            .select(`*, courts (*)`)
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data as Venue[];
    } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
            console.log('ℹ️ Fetch owner venues aborted');
            return [];
        }
        console.error('❌ Error fetching owner venues:', error);
        return [];
    }
};

export const createVenue = async (venueData: Omit<Venue, 'id' | 'courts' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Venue | null> => {
    try {
        console.log('🏟️ Creating Venue with data:', venueData);
        // Payload is already snake_case if typing matches
        // Explicit mapping to be safe
        const payload = {
            owner_id: venueData.owner_id,
            name: venueData.name,
            address: venueData.address,
            image_url: venueData.image_url,
            opening_hours: venueData.opening_hours,
            amenities: venueData.amenities,
            contact_info: venueData.contact_info,
            latitude: venueData.latitude,
            longitude: venueData.longitude,
            is_active: true
        };

        const { data, error } = await supabase
            .from('venues')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating venue:', error);
            throw error;
        }

        console.log('✅ Venue created via API:', data);
        return data as Venue;
    } catch (error) {
        console.error('❌ Exception in createVenue:', error);
        throw error;
    }
};

type CourtInput = Omit<Court, 'id'> & { imageFile?: File };

export const createVenueWithCourts = async (
    venueData: Omit<Venue, 'id' | 'courts' | 'created_at' | 'updated_at' | 'is_active'>,
    newCourts: CourtInput[]
): Promise<boolean> => {
    try {
        const createdVenue = await createVenue(venueData);
        if (!createdVenue) return false;

        if (newCourts.length > 0) {
            await addCourts(createdVenue.id, newCourts);
        }
        return true;
    } catch (error) {
        console.error('❌ Error in createVenueWithCourts:', error);
        return false;
    }
};

export const updateVenue = async (id: string, updates: Partial<Venue>): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('venues')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error updating venue:', error);
        return false;
    }
};

export const deleteVenue = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('venues').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error deleting venue:', error);
        return false;
    }
};

// ============================================
// COURTS
// ============================================

export const addCourts = async (venueId: string, courts: CourtInput[]) => {
    try {
        const courtsToInsert = await Promise.all(courts.map(async (court, index) => {
            console.log(`Processing court ${index + 1}/${courts.length}: ${court.name}`);

            let finalImageUrl = court.image_url || '';
            const imageFile = court.imageFile;

            if (imageFile) {
                console.log(`📸 Uploading image for court ${court.name}...`);
                const cleanFileName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const path = `courts/${venueId}/${Date.now()}_${cleanFileName}`;

                const uploadedUrl = await uploadImage(imageFile, 'venue-images', path);
                if (uploadedUrl) finalImageUrl = uploadedUrl;
            }

            return {
                venue_id: venueId,
                name: court.name,
                type: court.type,
                price_per_hour: court.price_per_hour,
                is_active: court.is_active ?? true,
                image_url: finalImageUrl
            };
        }));

        const { error } = await supabase.from('courts').insert(courtsToInsert);
        if (error) throw error;
        console.log('✅ Courts inserted successfully');
    } catch (error) {
        console.error('❌ Error adding courts:', error);
        throw error;
    }
};

export const updateCourt = async (courtId: string, updates: Partial<Court>): Promise<boolean> => {
    try {
        const { error } = await supabase.from('courts').update(updates).eq('id', courtId);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error updating court:', error);
        return false;
    }
};

export const deleteCourt = async (courtId: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('courts').delete().eq('id', courtId);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error deleting court:', error);
        return false;
    }
};

export const uploadCourtImage = async (file: File, courtId: string): Promise<string | null> => {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `courts/${courtId}_${Date.now()}_${cleanFileName}`;
    return await uploadImage(file, 'venue-images', path);
};

// ============================================
// BOOKINGS
// ============================================

export const getBookings = async (ownerId?: string): Promise<Booking[]> => {
    try {
        let query;

        if (ownerId) {
            query = supabase
                .from('bookings')
                .select(`
                    *,
                    profiles:player_id (full_name, email, phone),
                    venues:venue_id!inner (name, owner_id),
                    courts:court_id (name, type)
                `)
                .eq('venues.owner_id', ownerId)
                .order('date', { ascending: false });
        } else {
            query = supabase
                .from('bookings')
                .select(`
                    *,
                    profiles:player_id (full_name, email, phone),
                    venues:venue_id (name),
                    courts:court_id (name, type)
                `)
                .order('date', { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;

        // Map and Flatten for Types matching
        return (data || []).map(b => ({
            ...b,
            start_time: b.start_time?.substring(0, 5), // Trim seconds
            end_time: b.end_time?.substring(0, 5),
            // Flatten nested relations to match Booking interface if needed
            // Checking types.ts, Booking interface has player_name, venue_name via interface extension?
            // Yes, checking types.ts: populated fields are part of interface.
            player_name: (b.profiles as any)?.full_name,
            venue_name: (b.venues as any)?.name,
            court_name: (b.courts as any)?.name,
            court_type: (b.courts as any)?.type
        })) as Booking[];
    } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
            return [];
        }
        console.error('❌ Error fetching all bookings:', error);
        return [];
    }
};

export const getVenueBookings = async (venueId: string, date: string): Promise<Booking[]> => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                profiles:player_id (full_name, email, phone) 
            `)
            .eq('venue_id', venueId)
            .eq('date', date)
            .order('start_time');

        if (error) throw error;

        return (data || []).map(b => ({
            ...b,
            start_time: b.start_time?.substring(0, 5),
            end_time: b.end_time?.substring(0, 5),
            player_name: (b.profiles as any)?.full_name,
            player_phone: (b.profiles as any)?.phone
        })) as Booking[];
    } catch (error) {
        console.error('❌ Error fetching bookings:', error);
        return [];
    }
};

export const createBooking = async (booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>): Promise<Booking | null> => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .insert(booking)
            .select()
            .single();

        if (error) throw error;

        // Return with time trimmed logic
        const b = data;
        return {
            ...b,
            start_time: b.start_time?.substring(0, 5),
            end_time: b.end_time?.substring(0, 5)
        } as Booking;
    } catch (error) {
        console.error('❌ Error creating booking:', error);
        return null;
    }
};

export const updateBookingStatus = async (id: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error updating booking status:', error);
        return false;
    }
};

export const cancelBooking = async (id: string): Promise<boolean> => {
    return updateBookingStatus(id, 'CANCELLED');
};

export const deleteBooking = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error deleting booking:', error);
        return false;
    }
};

// ============================================
// DISABLED SLOTS
// ============================================

export const getDisabledSlots = async (venueId: string, date: string): Promise<DisabledSlot[]> => {
    try {
        const { data, error } = await supabase
            .from('disabled_slots')
            .select('*')
            .eq('venue_id', venueId)
            .eq('date', date);

        if (error) throw error;

        // Trim seconds from time_slot
        return (data || []).map(s => ({
            ...s,
            time_slot: s.time_slot?.substring(0, 5)
        })) as DisabledSlot[];
    } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
            return [];
        }
        console.error('❌ Error fetching disabled slots:', error);
        return [];
    }
};

export const createDisabledSlot = async (slot: Omit<DisabledSlot, 'id'>): Promise<DisabledSlot | null> => {
    try {
        const { data, error } = await supabase
            .from('disabled_slots')
            .insert(slot)
            .select()
            .single();

        if (error) throw error;
        return { ...data, time_slot: data.time_slot?.substring(0, 5) } as DisabledSlot;
    } catch (error) {
        console.error('❌ Error creating disabled slot:', error);
        return null;
    }
};

export const deleteDisabledSlot = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('disabled_slots').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error deleting disabled slot:', error);
        return false;
    }
};

export const toggleSlotAvailability = async (
    venueId: string,
    courtId: string,
    date: string,
    time: string,
    reason?: string
): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('❌ No user found for toggleSlot');
            return false;
        }

        // Use maybeSingle to check existence
        const { data, error } = await supabase
            .from('disabled_slots')
            .select('id')
            .eq('venue_id', venueId)
            .eq('court_id', courtId)
            .eq('date', date)
            .eq('time_slot', time)
            .maybeSingle(); // FIX: Avoid 406 error

        if (data) {
            console.log(`✅ Slot occupied (${data.id}). Re-enabling...`);
            return await deleteDisabledSlot(data.id);
        } else {
            console.log(`🚫 Slot free. Disabling...`);
            await createDisabledSlot({
                venue_id: venueId,
                court_id: courtId,
                date: date,
                time_slot: time,
                created_by: user.id,
                reason: reason || 'Manual lock',
                created_at: new Date().toISOString()
            });
            return true;
        }
    } catch (error) {
        console.error('❌ Error toggling slot:', error);
        return false;
    }
};

// ============================================
// PROFILE
// ============================================
export const getUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data as Profile;
    } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
            return null;
        }
        console.error('❌ Error fetching profile:', error);
        return null;
    }
};

export const updateUserProfile = async (userId: string, updates: Partial<Profile>): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        return false;
    }
};
