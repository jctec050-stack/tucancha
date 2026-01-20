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
    // Run Pre-flight Check
    const health = await checkSystemHealth();
    if (!health.db) {
        console.error('Error de conexión con la Base de Datos. Revisa tu internet o la configuración de Supabase.');
        return false;
    }

    let imageUrl = venue.imageUrl;

    // Handle Image Upload if it's base64
    if (imageUrl && imageUrl.startsWith('data:image')) {
        console.log('📤 Uploading image to storage (Optimistic check)...');

        // Try uploading even if health.storage is false (Bucket might exist but be hidden from list)
        const uploadedUrl = await uploadVenueImage(imageUrl, venue.ownerId);

        if (uploadedUrl) {
            console.log('✅ Image uploaded successfully:', uploadedUrl);
            imageUrl = uploadedUrl;
        } else {
            console.warn('⚠️ Image upload failed, saving without image');
            imageUrl = '';
        }
    }

    try {
        console.log('📝 Attempting to insert venue into DB (Image URL length: ' + imageUrl.length + ')');

        // Create insert promise
        const insertPromise = supabase
            .from('venues')
            .insert({
                owner_id: venue.ownerId,
                name: venue.name,
                address: venue.address,
                image_url: imageUrl,
                opening_hours: venue.openingHours,
                amenities: venue.amenities,
                contact_info: venue.contactInfo
            })
            .select()
            .single();

        // Create timeout promise (10 seconds)
        const dbTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: Database insert took too long. Likely RLS or Network issue.')), 10000)
        );

        // Race them
        console.log('⏳ Starting DB Insert with 10s timeout...');
        const { data: venueData, error: venueError } = await Promise.race([insertPromise, dbTimeoutPromise]) as any;

        console.log('📝 DB Insert response:', { venueData, venueError });

        if (venueError) {
            console.error('❌ Error creating venue:', venueError);
            return false;
        }

        // 2. Insert Courts
        if (courts.length > 0) {
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
        timeSlot: ds.time_slot,
        reason: ds.reason
    }));
};

export const toggleSlotAvailability = async (
    venueId: string,
    courtId: string,
    date: string,
    timeSlot: string
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
                time_slot: timeSlot
            });

        if (error) {
            console.error('Error disabling slot:', error);
            return false;
        }
    }

    return true;
};
