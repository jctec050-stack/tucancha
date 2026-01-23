import { supabase } from '@/lib/supabase';
import { Venue, Court, Booking } from '@/types';

// Upload court image to Supabase Storage
export const uploadCourtImage = async (file: File, courtId: string): Promise<string | null> => {
    try {
        console.log('🔍 [uploadCourtImage] START');
        console.log('  📁 File:', file.name, 'Size:', file.size, 'Type:', file.type);
        console.log('  🆔 Court ID:', courtId);

        const fileExt = file.name.split('.').pop();
        const fileName = `${courtId}-${Date.now()}.${fileExt}`;
        console.log('  📝 Generated filename:', fileName);

        console.log('  ⏳ Starting upload to Supabase...');
        const { data, error } = await supabase.storage
            .from('court-images')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('  ❌ Upload error:', error);
            console.error('  ❌ Error details:', JSON.stringify(error, null, 2));
            return null;
        }

        console.log('  ✅ Upload successful, data:', data);

        const { data: { publicUrl } } = supabase.storage
            .from('court-images')
            .getPublicUrl(fileName);

        console.log('  🔗 Public URL generated:', publicUrl);
        console.log('✅ [uploadCourtImage] END - SUCCESS');
        return publicUrl;
    } catch (error) {
        console.error('❌ [uploadCourtImage] EXCEPTION:', error);
        return null;
    }
};


// Venues & Courts
export const getVenues = async (ownerId?: string): Promise<Venue[]> => {
    let query = supabase
        .from('venues')
        .select(`
      *,
      courts (*)
    `);

    // Filter by owner if provided
    if (ownerId) {
        query = query.eq('owner_id', ownerId);
    }

    const { data: venues, error } = await query;

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
        latitude: v.latitude,
        longitude: v.longitude,
        courts: v.courts.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            pricePerHour: c.price_per_hour,
            imageUrl: c.image_url
        }))
    }));
};

// Helper to upload base64 image to Supabase Storage
const uploadVenueImage = async (base64Image: string, userId: string): Promise<string | null> => {
    try {
        // Convert base64 to Blob
        const res = await fetch(base64Image);
        const blob = await res.blob();

        // Generate unique filename
        const filename = `${userId}/${Date.now()}.jpg`;

        console.log('⏳ Starting upload to "venues" bucket...');

        // Create upload promise
        const uploadPromise = supabase.storage
            .from('venues')
            .upload(filename, blob, {
                contentType: 'image/jpeg',
                upsert: true
            });

        // Create timeout promise (5 seconds)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: Image upload took too long. Check if "venues" bucket exists.')), 5000)
        );

        // Race them
        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

        if (error) {
            console.error('❌ Error uploading image:', error);
            return null;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('venues')
            .getPublicUrl(filename);

        return publicUrl;
    } catch (e) {
        console.error('❌ Exception uploading image:', e);
        return null;
    }
};

const checkSystemHealth = async () => {
    console.log('🩺 Starting System Health Check...');
    const results = { db: false, storage: false, auth: false };

    // 0. Check Client Config
    console.log('🔍 Checking Supabase Config...');
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        console.log(`   URL Configured: ${url ? 'YES' : 'NO'} (${url?.substring(0, 10)}...)`);
        console.log(`   Key Configured: ${key ? 'YES' : 'NO'}`);

        if (!url || !key) {
            console.error('❌ CRITICAL: Supabase Env Vars missing!');
            alert('FATAL: Missing Supabase Env Vars');
            return results;
        }
    } catch (e) { console.error('Error checking config', e); }

    // 1. Check Auth (with timeout)
    console.log('🔐 Verifying Auth Session...');
    try {
        const authPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('Auth Timeout'), 5000));

        const { data: { session } } = await Promise.race([authPromise, timeoutPromise]) as any;

        if (session) {
            console.log('✅ Auth: User is logged in:', session.user.id);
            results.auth = true;
        } else {
            console.error('❌ Auth: No active session found (User might be logged out)');
        }
    } catch (e) {
        console.error('❌ Auth: Check FAILED or TIMED OUT:', e);
    }

    // 2. Check DB Read
    try {
        console.log('💾 Verifying Database Connection...');
        const { error: dbError } = await supabase.from('venues').select('id').limit(1);
        if (!dbError) {
            console.log('✅ DB: Connection successful');
            results.db = true;
        } else {
            console.error('❌ DB: Connection failed:', dbError.message);
        }
    } catch (e) {
        console.error('❌ DB: Exception:', e);
    }

    // 3. Check Storage
    try {
        console.log('📦 Verifying Storage...');
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
        if (!storageError) {
            console.log('✅ Storage: Listed buckets:', buckets?.map(b => b.name));
            const venuesBucket = buckets?.find(b => b.name === 'venues');
            if (venuesBucket) {
                console.log('✅ Storage: "venues" bucket exists');
                results.storage = true;
            } else {
                console.error('❌ Storage: "venues" bucket MISSING');
            }
        } else {
            console.error('❌ Storage: List buckets failed:', storageError.message);
        }
    } catch (e) {
        console.error('❌ Storage: Exception:', e);
    }

    return results;
};

export const createVenueWithCourts = async (
    venue: Omit<Venue, 'id' | 'courts'>,
    courts: Omit<Court, 'id'>[]
): Promise<boolean> => {
    // Store image as base64 directly (no upload to storage)
    const imageUrl = venue.imageUrl || '';

    // Geocode address to get coordinates
    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
        console.log('🌍 Geocoding address:', venue.address);
        const { geocodeAddress } = await import('@/lib/geocoding');
        const coords = await geocodeAddress(venue.address);

        if (coords) {
            latitude = coords.lat;
            longitude = coords.lng;
            console.log('✅ Coordinates obtained:', coords);
        } else {
            console.warn('⚠️ Could not geocode address, saving without coordinates');
        }
    } catch (error) {
        console.error('❌ Geocoding error:', error);
    }

    try {
        console.log('📝 Inserting venue into DB (Image URL length: ' + imageUrl.length + ')');

        const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .insert({
                owner_id: venue.ownerId,
                name: venue.name,
                address: venue.address,
                image_url: imageUrl,
                opening_hours: venue.openingHours,
                amenities: venue.amenities,
                contact_info: venue.contactInfo,
                latitude: latitude,
                longitude: longitude
            })
            .select()
            .single();

        if (venueError) {
            console.error('❌ Error creating venue:', venueError);
            alert(`Error al crear complejo: ${venueError.message}. Verifica las políticas RLS en Supabase.`);
            return false;
        }

        // 2. Insert Courts
        if (courts.length > 0) {
            const courtsToInsert = courts.map(c => ({
                venue_id: venueData.id,
                name: c.name,
                type: c.type,
                price_per_hour: c.pricePerHour,
                image_url: c.imageUrl || null
            }));

            const { error: courtsError } = await supabase
                .from('courts')
                .insert(courtsToInsert);

            if (courtsError) {
                console.error('❌ Error creating courts:', courtsError);
                return false;
            }
        }

        return true;
    } catch (error: any) {
        console.error('❌ Exception creating venue:', error);
        return false;
    }
};

export const addCourts = async (venueId: string, courts: Omit<Court, 'id'>[]): Promise<boolean> => {
    try {
        console.log('💾 [addCourts] START');
        console.log('  🏢 Venue ID:', venueId);
        console.log('  📊 Number of courts to insert:', courts.length);

        const courtsToInsert = courts.map(c => ({
            venue_id: venueId,
            name: c.name,
            type: c.type,
            price_per_hour: c.pricePerHour,
            image_url: c.imageUrl || null
        }));

        console.log('  📝 Courts to insert:', JSON.stringify(courtsToInsert, null, 2));

        const { error } = await supabase
            .from('courts')
            .insert(courtsToInsert);

        if (error) {
            console.error('  ❌ Error adding courts:', error);
            console.error('  ❌ Error details:', JSON.stringify(error, null, 2));
            return false;
        }

        console.log('  ✅ Courts inserted successfully');
        console.log('✅ [addCourts] END - SUCCESS');
        return true;
    } catch (error) {
        console.error('❌ [addCourts] EXCEPTION:', error);
        return false;
    }
};

export const updateVenue = async (
    venueId: string,
    updates: Partial<Omit<Venue, 'id' | 'courts' | 'ownerId'>>
): Promise<boolean> => {
    try {
        let imageUrl = updates.imageUrl;

        // Handle Image Upload if it's base64 (new image selected)
        if (imageUrl && imageUrl.startsWith('data:image')) {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                console.log('📤 Uploading new image for venue update...');
                const uploadedUrl = await uploadVenueImage(imageUrl, user.id);
                if (uploadedUrl) {
                    imageUrl = uploadedUrl;
                }
            }
        }

        const { error } = await supabase
            .from('venues')
            .update({
                name: updates.name,
                address: updates.address,
                opening_hours: updates.openingHours,
                image_url: imageUrl,
                amenities: updates.amenities,
                contact_info: updates.contactInfo
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
            console.error('Error deleting venue:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Exception deleting venue:', error);
        return false;
    }
};

export const deleteCourt = async (courtId: string): Promise<boolean> => {
    try {
        console.log('🔍 Deleting court with ID:', courtId);
        const { error } = await supabase
            .from('courts')
            .delete()
            .eq('id', courtId);

        if (error) {
            console.error('❌ Error deleting court:', error);
            return false;
        }
        console.log('✅ Court deleted successfully:', courtId);
        return true;
    } catch (error) {
        console.error('❌ Exception deleting court:', error);
        return false;
    }
};

// Bookings
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
    } catch (error: any) {
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
    } catch (error: any) {
        console.error('❌ Exception deleting booking:', error);
        return false;
    }
};

export const getBookings = async (): Promise<Booking[]> => {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
      *,
      venue:venues(name),
      court:courts(name, type),
      player:profiles(full_name)
    `);

    if (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }

    const now = new Date();
    const currentDateTime = now.getTime(); // Current timestamp

    const processedBookings = await Promise.all(bookings.map(async (b: any) => {
        // Parse booking date and end time
        // b.date is "YYYY-MM-DD", b.end_time is "HH:mm:ss"
        const bookingDateTimeStr = `${b.date}T${b.end_time}`;
        const bookingDate = new Date(bookingDateTimeStr);
        const bookingTimestamp = bookingDate.getTime();

        let status = b.status;

        // Check if booking is ACTIVE but expired
        if (status === 'ACTIVE' && bookingTimestamp < currentDateTime) {
            console.log(`🔄 Auto-closing booking ${b.id} ended at ${bookingDateTimeStr}`);

            // Fire-and-forget update to DB
            supabase
                .from('bookings')
                .update({ status: 'COMPLETED' })
                .eq('id', b.id)
                .then(({ error }) => {
                    // Start of RLS Error Handling
                    // If we get an error here, it's likely RLS preventing the player from updating the global status.
                    // This is fine because we already set status = 'COMPLETED' locally for the UI.
                    // We suppress the error to avoid console noise unless it's critical.
                    if (error && Object.keys(error).length > 0) {
                        console.warn('⚠️ Could not persist auto-close to DB (likely permissions/RLS). UI will still show correct status.', error);
                    }
                });

            // ALWAYS return COMPLETED for display if the time has passed
            status = 'COMPLETED';
        }

        return {
            id: b.id,
            venueId: b.venue_id,
            courtId: b.court_id,
            venueName: b.venue?.name || 'Unknown',
            courtName: b.court?.name || 'Unknown',
            courtType: b.court?.type,
            playerId: b.player_id, // Add playerId for filtering
            playerName: b.player?.full_name || 'Usuario',
            date: b.date,
            startTime: b.start_time.substring(0, 5), // Normalize to HH:MM
            endTime: b.end_time.substring(0, 5),     // Normalize to HH:MM
            price: b.price,
            status: status,
            createdAt: new Date(b.created_at).getTime()
        };
    }));

    return processedBookings;
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

// Disabled Slots Management
export const getDisabledSlots = async (venueId: string, date: string) => {
    const { data, error } = await supabase
        .from('disabled_slots')
        .select('*')
        .eq('venue_id', venueId)
        .eq('date', date);

    if (error) {
        console.error('Error fetching disabled slots:', error);
        return [];
    }

    return data.map((ds: any) => ({
        id: ds.id,
        venueId: ds.venue_id,
        courtId: ds.court_id,
        date: ds.date,
        timeSlot: ds.time_slot.substring(0, 5),
        reason: ds.reason
    }));
};

export const toggleSlotAvailability = async (
    venueId: string,
    courtId: string,
    date: string,
    timeSlot: string,
    reason: string = ''
): Promise<boolean> => {
    // Check if slot is already disabled
    const { data: existing } = await supabase
        .from('disabled_slots')
        .select('id')
        .eq('court_id', courtId)
        .eq('date', date)
        .eq('time_slot', timeSlot)
        .maybeSingle();

    if (existing) {
        // Enable slot (remove from disabled_slots)
        const { error } = await supabase
            .from('disabled_slots')
            .delete()
            .eq('id', existing.id);

        if (error) {
            console.error('Error enabling slot:', error);
            return false;
        }
    } else {
        // Disable slot (add to disabled_slots)
        const { error } = await supabase
            .from('disabled_slots')
            .insert({
                venue_id: venueId,
                court_id: courtId,
                date: date,
                time_slot: timeSlot,
                reason: reason
            });

        if (error) {
            console.error('Error disabling slot:', error);
            return false;
        }
    }

    return true;
};
