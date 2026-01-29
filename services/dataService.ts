import { supabase } from '@/lib/supabase';
import { Venue, Court, Booking, BookingStatus, DisabledSlot, Profile, Subscription, Payment, AdminVenueData, AdminProfileData, AdminSubscriptionData, AdminPaymentData } from '@/types';

// NOTE: Removed legacy adapters import. 
// We now map directly to snake_case matching types.ts and DB.

// ============================================
// HELPERS
// ============================================

const getDerivedStatus = (booking: any): BookingStatus => {
    if (booking.status === 'CANCELLED') return 'CANCELLED';
    if (booking.status === 'COMPLETED') return 'COMPLETED';
    
    // If manually completed, keep it.
    // If status is ACTIVE, check if it should be COMPLETED based on time.
    
    const now = new Date();
    
    // Parse Booking Date/Time
    // booking.date is YYYY-MM-DD
    // booking.start_time is HH:mm or HH:mm:ss
    // booking.end_time is HH:mm or HH:mm:ss
    
    try {
        const datePart = booking.date;
        let timePart = booking.end_time;
        
        // If no end_time, assume start_time + 1 hour
        if (!timePart) {
            const startTime = booking.start_time;
            if (!startTime) return booking.status; // Cannot determine
            
            const [h, m] = startTime.split(':').map(Number);
            const endH = h + 1;
            timePart = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
        
        // Handle HH:mm:ss vs HH:mm
        if (timePart.length > 5) timePart = timePart.substring(0, 5);
        
        const bookingEnd = new Date(`${datePart}T${timePart}`);
        
        // Check if date is valid
        if (isNaN(bookingEnd.getTime())) return booking.status;
        
        if (now > bookingEnd) {
            return 'COMPLETED';
        }
        
        return 'ACTIVE';
    } catch (e) {
        return booking.status;
    }
};

// ============================================
// HELPER: Upload Image to Supabase Storage
// ============================================
export const uploadImage = async (
    file: File,
    bucket: 'venue-images' | 'court-images' | 'court-photos',
    path: string
): Promise<string | null> => {
    try {
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
            return [];
        }
        console.error('❌ Error fetching owner venues:', error);
        return [];
    }
};

export const createVenue = async (venueData: Omit<Venue, 'id' | 'courts' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Venue | null> => {
    try {
        // 1. Check for duplicates (Name check - Case Insensitive)
        const { data: existingVenue } = await supabase
            .from('venues')
            .select('id')
            .ilike('name', venueData.name)
            .maybeSingle();

        if (existingVenue) {
            throw new Error('DUPLICATE_VENUE_NAME');
        }

        // Payload is already snake_case if typing matches
        // Explicit mapping to be safe
        const payload = {
            owner_id: venueData.owner_id,
            name: venueData.name,
            address: venueData.address,
            image_url: venueData.image_url,
            opening_hours: venueData.opening_hours,
            closed_days: venueData.closed_days || [],
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
    } catch (error: any) {
        console.error('❌ Error in createVenueWithCourts:', error);
        if (error.message === 'DUPLICATE_VENUE_NAME') {
            throw error;
        }
        return false;
    }
};

export const updateVenue = async (id: string, updates: Partial<Venue>): Promise<boolean> => {
    try {
        if (updates.name) {
            // Check if another venue (not this one) has the same name
            const { data: existingVenue } = await supabase
                .from('venues')
                .select('id')
                .ilike('name', updates.name)
                .neq('id', id)
                .maybeSingle();

            if (existingVenue) {
                throw new Error('DUPLICATE_VENUE_NAME');
            }
        }

        const { error } = await supabase
            .from('venues')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('❌ Error updating venue:', error);
        if (error.message === 'DUPLICATE_VENUE_NAME') {
            throw error;
        }
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
        const courtsWithVenueId = [];
        
        for (let index = 0; index < courts.length; index++) {
            const court = courts[index];
            
            let imageUrl = court.image_url;
            const imageFile = court.imageFile;

            if (imageFile) {
                const cleanFileName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const path = `courts/${venueId}/${Date.now()}_${cleanFileName}`;

                const uploadedUrl = await uploadImage(imageFile, 'venue-images', path);
                if (uploadedUrl) imageUrl = uploadedUrl;
            }
            
            courtsWithVenueId.push({
                venue_id: venueId,
                name: court.name,
                type: court.type,
                price_per_hour: court.price_per_hour,
                image_url: imageUrl,
                is_active: court.is_active ?? true
            });
        }

        const { data, error } = await supabase
            .from('courts')
            .insert(courtsWithVenueId)
            .select();

        if (error) throw error;
        
        return data as Court[];
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
                    venues:venue_id (name, address, contact_info, latitude, longitude),
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
            status: getDerivedStatus(b),
            // Flatten nested relations to match Booking interface if needed
            // Checking types.ts, Booking interface has player_name, venue_name via interface extension?
            // Yes, checking types.ts: populated fields are part of interface.
            player_name: b.player_name || (b.profiles as any)?.full_name,
            player_phone: b.player_phone || (b.profiles as any)?.phone,
            venue_name: (b.venues as any)?.name,
            venue_address: (b.venues as any)?.address,
            venue_contact_info: (b.venues as any)?.contact_info,
            venue_latitude: (b.venues as any)?.latitude,
            venue_longitude: (b.venues as any)?.longitude,
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
            status: getDerivedStatus(b),
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

export const createRecurringBookings = async (
    bookingTemplate: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'date'>,
    startDate: string,
    endDate: string,
    dayOfWeek: number // 0-6 (Sun-Sat)
): Promise<{ success: number; failures: number }> => {
    let success = 0;
    let failures = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const datesToBook: string[] = [];
    
    // 1. Calculate valid dates first
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === dayOfWeek) {
            datesToBook.push(d.toISOString().split('T')[0]);
        }
    }

    if (datesToBook.length === 0) {
        return { success: 0, failures: 0 };
    }

    // 2. Calculate price per booking (Total / Count) with remainder distribution
    // This ensures the sum of all booking prices equals exactly the total price provided
    const totalCount = datesToBook.length;
    const basePrice = Math.floor(bookingTemplate.price / totalCount);
    const remainder = bookingTemplate.price % totalCount;

    // 3. Create Bookings
    for (let i = 0; i < totalCount; i++) {
        const dateStr = datesToBook[i];
        
        // Distribute remainder among the first few bookings
        // e.g. 100 / 3 => 33.33... => 34, 33, 33 (Sum: 100)
        const finalPrice = i < remainder ? basePrice + 1 : basePrice;

        const booking = {
            ...bookingTemplate,
            price: finalPrice,
            date: dateStr
        };
        
        const result = await createBooking(booking);
        if (result) {
            success++;
        } else {
            failures++;
        }
    }

    return { success, failures };
};

export const getProfileByEmail = async (email: string): Promise<Profile | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (error) throw error;
        return data as Profile;
    } catch (error) {
        console.error('❌ Error fetching profile by email:', error);
        return null;
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
            return await deleteDisabledSlot(data.id);
        } else {
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

        if (error) throw error;
        return data as Profile;
    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        return null;
    }
};

// ============================================
// ADMIN DASHBOARD
// ============================================

export const getAdminDashboardData = async (): Promise<AdminVenueData[]> => {
    try {
        // 1. Fetch all venues with their owners and courts
        const { data: venuesData, error: venuesError } = await supabase
            .from('venues')
            .select(`
                *,
                owner:profiles!owner_id (*),
                courts (*)
            `)
            .order('created_at', { ascending: false });

        if (venuesError) throw venuesError;
        if (!venuesData) return [];

        const venues = venuesData as unknown as (Venue & { owner: Profile })[];

        // 2. Fetch all subscriptions
        const { data: subscriptionsData, error: subsError } = await supabase
            .from('subscriptions')
            .select('*');

        if (subsError) console.error('Error fetching subscriptions:', subsError);
        const subscriptions = subscriptionsData || [];

        // 3. Fetch all bookings (summary)
        // Note: For a real app, this should be paginated or aggregated via RPC/View
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, venue_id, court_id, price, status, payment_status')
            .neq('status', 'CANCELLED'); // Only count active/completed

        if (bookingsError) console.error('Error fetching bookings:', bookingsError);
        const bookings = bookingsData || [];

        // 4. Aggregate data
        const adminData: AdminVenueData[] = venues.map(venue => {
            // Find subscription
            const sub = subscriptions.find(s => s.owner_id === venue.owner_id && s.status === 'ACTIVE') || 
                        subscriptions.find(s => s.owner_id === venue.owner_id); // Fallback to any sub

            // Filter bookings for this venue
            const venueBookings = bookings.filter(b => b.venue_id === venue.id);
            
            // Calculate total revenue
            const totalRevenue = venueBookings.reduce((sum, b) => sum + (b.price || 0), 0);

            // Calculate revenue per court
            const revenueByCourt: Record<string, number> = {};
            venue.courts?.forEach(court => {
                const courtRevenue = venueBookings
                    .filter(b => b.court_id === court.id)
                    .reduce((sum, b) => sum + (b.price || 0), 0);
                revenueByCourt[court.id] = courtRevenue;
            });

            return {
                ...venue,
                owner: venue.owner,
                subscription: sub,
                total_revenue: totalRevenue,
                total_bookings: venueBookings.length,
                revenue_by_court: revenueByCourt
            };
        });

        return adminData;
    } catch (error) {
        console.error('❌ Error fetching admin data:', error);
        return [];
    }
};



export const getAdminClientsData = async (): Promise<AdminProfileData[]> => {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'OWNER') // Filter for Owners only
            .order('created_at', { ascending: false });

        if (error) throw error;
        return profiles || [];
    } catch (error) {
        console.error('❌ Error fetching admin clients:', error);
        return [];
    }
};

export const getAdminSubscriptionsData = async (): Promise<AdminSubscriptionData[]> => {
    try {
        const { data: subs, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                owner:profiles!owner_id (*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return subs as AdminSubscriptionData[] || [];
    } catch (error) {
        console.error('❌ Error fetching admin subscriptions:', error);
        return [];
    }
};

export const getAdminPaymentsData = async (): Promise<AdminPaymentData[]> => {
    try {
        const { data: payments, error } = await supabase
            .from('payments')
            .select(`
                *,
                payer:profiles!payer_id (*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Enrich data if needed (e.g. resolve booking/sub details) - doing simple return for now
        return payments as AdminPaymentData[] || [];
    } catch (error) {
        console.error('❌ Error fetching admin payments:', error);
        return [];
    }
};

export const updateUserProfile = async (userId: string, updates: Partial<Profile>): Promise<Profile | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as Profile;
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        return null;
    }
};

export const updateSubscription = async (subId: string, updates: Partial<Subscription>): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('subscriptions')
            .update(updates)
            .eq('id', subId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error updating subscription:', error);
        return false;
    }
};

export const createSubscription = async (subData: Partial<Subscription>): Promise<Subscription | null> => {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .insert(subData)
            .select()
            .single();

        if (error) throw error;
        return data as Subscription;
    } catch (error) {
        console.error('❌ Error creating subscription:', error);
        return null;
    }
};

export const createPayment = async (paymentData: Partial<Payment>): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('payments')
            .insert(paymentData);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error creating payment:', error);
        return false;
    }
};
