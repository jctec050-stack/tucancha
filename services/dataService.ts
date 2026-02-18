import { supabase } from '@/lib/supabase';
import { Venue, Court, Booking, BookingStatus, DisabledSlot, Profile, Subscription, Payment, AdminVenueData, AdminProfileData, AdminSubscriptionData, AdminPaymentData } from '@/types';
import { BookingSchema } from '@/lib/validations';
import { getLocalDateString } from '@/utils/dateUtils';

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
            .select(`
                id, name, address, image_url, opening_hours, closed_days, amenities, 
                contact_info, latitude, longitude, is_active, owner_id, limit_future_bookings,
                courts (id, name, type, price_per_hour, is_active, image_url)
            `)
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
            limit_future_bookings: venueData.limit_future_bookings ?? false,
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
// NOTIFICATIONS
// ============================================

export const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'BOOKING' | 'PAYMENT' | 'SYSTEM' | 'PROMOTION',
    metadata?: any
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                metadata
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        return false;
    }
};

export const getUserNotifications = async (userId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        return [];
    }
};

export const markNotificationAsRead = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        return false;
    }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error marking all notifications as read:', error);
        return false;
    }
};

export const deleteNotification = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error deleting notification:', error);
        return false;
    }
};

export const clearAllNotifications = async (userId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error clearing notifications:', error);
        return false;
    }
};

// ============================================
// BOOKINGS
// ============================================

export interface GetBookingsOptions {
    ownerId?: string;
    venueId?: string;
    playerId?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    includePlayerVisibility?: boolean;
}

export interface PaginatedResult<T> {
    data: T[];
    count: number;
}

export const getBookings = async (
    options: GetBookingsOptions = {}
): Promise<PaginatedResult<Booking>> => {
    try {
        const { ownerId, venueId, playerId, page, limit, startDate, endDate, status, includePlayerVisibility } = options;

        // Base select string
        let selectQuery = `
            id, date, start_time, end_time, price, status, payment_status, created_at,
            profiles:player_id (full_name, email, phone),
            venues:venue_id!inner (name, address, contact_info, latitude, longitude, owner_id),
            courts:court_id (name, type)
        `;

        // Conditionally add is_hidden_for_player if requested
        if (includePlayerVisibility) {
            selectQuery += `, is_hidden_for_player`;
        }

        // Base query
        let query = supabase
            .from('bookings')
            .select(selectQuery, { count: 'exact' });

        // Apply Filters
        if (ownerId) {
            query = query.eq('venues.owner_id', ownerId);
        }

        if (venueId) {
            query = query.eq('venue_id', venueId);
        }

        if (playerId) {
            query = query.eq('player_id', playerId);
            
            // Only filter if the column is included and requested
            if (includePlayerVisibility) {
                // Filter out hidden bookings for player (handle null as false)
                query = query.not('is_hidden_for_player', 'eq', true);
            }
        }

        if (startDate) {
            query = query.gte('date', startDate);
        }

        if (endDate) {
            query = query.lte('date', endDate);
        }

        if (status) {
            query = query.eq('status', status);
        }

        // Apply Pagination
        if (page && limit) {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
        }

        // Default Order
        query = query.order('date', { ascending: false });

        const { data, error, count } = await query;

        if (error) throw error;

        // Map and Flatten
        const mappedData = (data || []).map(b => {
            // Force cast 'b' to any to access joined tables safely
            const raw = b as any;
            
            return {
                ...b,
                start_time: b.start_time?.substring(0, 5), // Trim seconds
                end_time: b.end_time?.substring(0, 5),
                status: getDerivedStatus(b),
                player_name: raw.player_name || raw.profiles?.full_name,
                player_phone: raw.player_phone || raw.profiles?.phone,
                venue_name: raw.venues?.name,
                venue_address: raw.venues?.address,
                venue_contact_info: raw.venues?.contact_info,
                venue_latitude: raw.venues?.latitude,
                venue_longitude: raw.venues?.longitude,
                court_name: raw.courts?.name,
                court_type: raw.courts?.type
            };
        }) as unknown as Booking[];

        return {
            data: mappedData,
            count: count || 0
        };

    } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
            return { data: [], count: 0 };
        }
        console.error('❌ Error fetching bookings:', error);
        return { data: [], count: 0 };
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

export const createBooking = async (
    booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>,
    shouldNotify: boolean = true
): Promise<{ success: boolean; data?: Booking; error?: string }> => {
    try {
        // 1. Zod Validation (Security & Data Integrity)
        const validation = BookingSchema.safeParse(booking);
        if (!validation.success) {
            // Return the first error message to the UI
            const errorMsg = validation.error.issues?.[0]?.message || 'Error de validación';
            return { success: false, error: errorMsg };
        }

        // 2. Overlap Validation (Business Logic)
        // Fetch existing active bookings for this court/date
        const { data: existingBookings } = await supabase
            .from('bookings')
            .select('start_time, end_time')
            .eq('court_id', booking.court_id)
            .eq('date', booking.date)
            .neq('status', 'CANCELLED');

        if (existingBookings && existingBookings.length > 0) {
            const getMinutes = (t: string) => {
                if (!t) return 0;
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };

            const startNew = getMinutes(booking.start_time);
            // Default to 60 min duration if end_time not provided
            const endNew = booking.end_time ? getMinutes(booking.end_time) : startNew + 60;

            const hasOverlap = existingBookings.some(b => {
                const startExisting = getMinutes(b.start_time);
                const endExisting = b.end_time ? getMinutes(b.end_time) : startExisting + 60;

                // Overlap: (StartA < EndB) and (EndA > StartB)
                return startNew < endExisting && endNew > startExisting;
            });

            if (hasOverlap) {
                return { success: false, error: 'HORARIO_OCUPADO' };
            }
        }

        // 3. Database Insert
        const { data, error } = await supabase
            .from('bookings')
            .insert(booking)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation fallback
                return { success: false, error: 'HORARIO_OCUPADO' };
            }
            throw error;
        }

        // --------------------------------------------
        // NOTIFY OWNER & PLAYER
        // --------------------------------------------
        if (shouldNotify) {
            try {
                // Get Venue Name and Owner ID
                const { data: venue } = await supabase
                    .from('venues')
                    .select('name, owner_id')
                    .eq('id', booking.venue_id)
                    .single();

                if (venue) {
                    const dateFormatted = new Date(booking.date).toLocaleDateString('es-PY');
                    const startTime = booking.start_time?.substring(0, 5) || '??:??';

                    // Notify Owner
                    if (venue.owner_id) {
                        await createNotification(
                            venue.owner_id,
                            'Nueva Reserva Recibida',
                            `Nueva reserva en ${venue.name} para el ${dateFormatted} a las ${startTime}hs`,
                            'BOOKING',
                            { booking_id: data.id, venue_id: booking.venue_id }
                        );
                    }

                    // Notify Player
                    await createNotification(
                        booking.player_id,
                        'Reserva Confirmada',
                        `Tu reserva en ${venue.name} para el ${dateFormatted} a las ${startTime}hs fue confirmada`,
                        'BOOKING',
                        { booking_id: data.id, venue_id: booking.venue_id }
                    );
                }
            } catch (notifError) {
                console.error('Error sending notification (non-blocking):', notifError);
            }
        }

        // Return with time trimmed logic
        const b = data;
        return {
            success: true,
            data: {
                ...b,
                start_time: b.start_time?.substring(0, 5),
                end_time: b.end_time?.substring(0, 5)
            } as Booking
        };
    } catch (error) {
        console.error('❌ Error creating booking:', error);
        return { success: false, error: 'ERROR_DESCONOCIDO' };
    }
};

export const notifyOwnerOfBookingBatch = async (
    venueId: string,
    date: string,
    bookings: Booking[]
) => {
    try {
        // Get Venue Name and Owner ID
        const { data: venue } = await supabase
            .from('venues')
            .select('name, owner_id')
            .eq('id', venueId)
            .single();

        if (!venue) return;
        if (bookings.length === 0) return;

        // Sort bookings by time
        const sorted = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time));
        const start = sorted[0].start_time.substring(0, 5);
        const last = sorted[sorted.length - 1];

        // Calculate end time of last booking (assuming 1h slots if not provided, but usually provided)
        let end = last.end_time?.substring(0, 5);
        if (!end) {
            const [h, m] = last.start_time.split(':').map(Number);
            end = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }

        // Format Date (Manual split to avoid timezone mismatches)
        const [year, month, day] = date.split('-');
        const dateFormatted = `${day}/${month}/${year}`;

        // Notify Owner
        if (venue.owner_id) {
            await createNotification(
                venue.owner_id,
                'Nueva Reserva Recibida',
                `Nueva reserva en ${venue.name} para el ${dateFormatted} de ${start} a ${end}hs`,
                'BOOKING',
                { booking_id: sorted[0].id, venue_id: venueId } // Link to first booking
            );
        }

        // Notify Player
        const playerId = sorted[0].player_id;
        if (playerId) {
            await createNotification(
                playerId,
                'Reserva Confirmada',
                `Tu reserva en ${venue.name} para el ${dateFormatted} de ${start} a ${end}hs fue confirmada`,
                'BOOKING',
                { booking_id: sorted[0].id, venue_id: venueId }
            );
        }

        // --------------------------------------------------------
        // PUSH NOTIFICATIONS (New Implementation)
        // --------------------------------------------------------
        try {
            // Enviar Push al Dueño
            if (venue.owner_id) {
                // Construir payload
                const pushPayload = {
                    userId: venue.owner_id,
                    title: '🎉 Nueva Reserva Recibida',
                    body: `${venue.name}: ${bookings.length} turno(s) para el ${dateFormatted} a las ${start}hs`,
                    url: '/dashboard', // Llevar al dashboard
                    data: {
                        venueId,
                        date,
                        bookingId: sorted[0].id
                    }
                };

                // Llamar a nuestra API
                // Usamos fetch sin await para no bloquear (fire and forget)
                fetch('/api/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pushPayload)
                }).then(res => {
                    if (res.ok) console.log('✅ Push enviado al Dueño');
                    else console.warn('⚠️ Falló envío push al Dueño');
                }).catch(e => console.error('Error push owner:', e));
            }

        } catch (pushError) {
            console.error('❌ Error general enviando push notifications:', pushError);
        }

    } catch (error) {
        console.error('❌ Error sending batch notification:', error);
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
    try {
        const success = await updateBookingStatus(id, 'CANCELLED');
        
        if (success) {
            // Trigger API notification in background
            fetch('/api/cancel-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: id })
            }).catch(e => console.error('Error triggering cancellation API:', e));
        }
        
        return success;
    } catch (error) {
        console.error('Error cancelling booking:', error);
        return false;
    }
};

export const deleteBooking = async (id: string): Promise<boolean> => {
    try {
        // Fetch booking first to notify before deleting
        const { data: booking } = await supabase.from('bookings').select('venue_id').eq('id', id).single();
        
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (error) throw error;

        if (booking) {
             // Notify cancellation (even if deleted)
             // We can't use the same API because the record is gone, but we can send a custom push here if needed.
             // Or better: Don't delete, just cancel. But if logic requires delete:
             // For now, we assume 'cancelBooking' is the main flow for users.
             // If we really need notification on delete, we should do it before deleting or soft-delete.
        }

        return true;
    } catch (error) {
        console.error('❌ Error deleting booking:', error);
        return false;
    }
};

export const hideBookingForPlayer = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('bookings')
            .update({ is_hidden_for_player: true })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error hiding booking:', error);
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
            datesToBook.push(getLocalDateString(d));
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
        if (result.success) {
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
            .select('*')
            .order('created_at', { ascending: false });

        if (subsError) console.error('Error fetching subscriptions:', subsError);
        const subscriptions = subscriptionsData || [];

        // 3. Fetch all bookings (summary)
        // Includes start_time/end_time for commission calculation
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, venue_id, court_id, price, status, payment_status, start_time, end_time, date')
            .neq('status', 'CANCELLED'); // Only count active/completed

        if (bookingsError) console.error('Error fetching bookings:', bookingsError);
        const bookings = bookingsData || [];

        // 4. Aggregate data
        const adminData: AdminVenueData[] = venues.map(venue => {
            // Find subscription (Latest one due to sorting)
            const sub = subscriptions.find(s => s.owner_id === venue.owner_id);

            // Calculate Billing Period and Trial Status
            const now = new Date();
            let billingStart = new Date(now.getFullYear(), now.getMonth(), 1); // Default to calendar month

            let isTrial = false;
            let trialEndDate: Date | null = null;

            if (sub && sub.start_date) {
                // Parse start date properly (YYYY-MM-DD)
                const [sYear, sMonth, sDay] = sub.start_date.split('-').map(Number);
                const subStartDate = new Date(sub.start_date);

                // Check Trial Status
                const potentialTrialEnd = new Date(subStartDate);
                potentialTrialEnd.setDate(potentialTrialEnd.getDate() + 30);

                // FIX: Only consider it a trial if the plan is NOT Premium.
                // If user upgraded to Premium, they are no longer in "Trial" mode for commission purposes,
                // unless the business logic explicitly gives 30 days free even for Premium.
                // Based on Owner Logic: "TRIAL" status or "FREE" plan triggers trial behavior.
                // "PREMIUM" status implies active billing.

                if (now < potentialTrialEnd && sub.plan_type !== 'PREMIUM') {
                    isTrial = true;
                    trialEndDate = potentialTrialEnd;
                }

                // Calculate Billing Cycle Start
                // Create a candidate date in the current month with the subscription start day
                // FIX: Use split logic to avoid Timezone Offset issues
                const candidateStart = new Date(now.getFullYear(), now.getMonth(), sDay);

                // If today is before the candidate start date, we are in the previous billing cycle
                if (now < candidateStart) {
                    candidateStart.setMonth(candidateStart.getMonth() - 1);
                }
                billingStart = candidateStart;
            } else if (venue.created_at) {
                // Fallback to venue creation day if no sub
                // Use UTC-safe parsing for created_at too
                const [cY, cM, cD] = venue.created_at.split('T')[0].split('-').map(Number);
                const createdDate = new Date(cY, cM - 1, cD);
                const sDay = createdDate.getDate();
                const candidateStart = new Date(now.getFullYear(), now.getMonth(), sDay);
                if (now < candidateStart) {
                    candidateStart.setMonth(candidateStart.getMonth() - 1);
                }
                billingStart = candidateStart;
            }

            // Billing End is Start + 1 month
            const billingEnd = new Date(billingStart);
            billingEnd.setMonth(billingEnd.getMonth() + 1);

            // Filter bookings for this venue AND this billing period AND status=COMPLETED
            const venueBookings = bookings.filter(b => {
                if (b.venue_id !== venue.id) return false;

                // Check Status (using helper logic)
                const status = getDerivedStatus(b);
                if (status !== 'COMPLETED') return false;

                // Check Date Range
                // FIX: Use manual parsing to avoid Timezone issues on booking date too
                const [bY, bM, bD] = b.date.split('-').map(Number);
                const bookingDate = new Date(bY, bM - 1, bD);

                return bookingDate >= billingStart && bookingDate < billingEnd;
            });

            // Calculate total revenue (Owner earnings)
            const totalRevenue = venueBookings.reduce((sum, b) => sum + (b.price || 0), 0);

            // Calculate Platform Commission: 5.000 Gs per Hour Booked
            let totalCommission = 0;

            // If in Trial, Commission is 0
            // FIX: If NO sub, assume NOT trial (so commission applies immediately if logic dictates)
            // But usually no sub means 'FREE' or just started.
            // Let's ensure commission calculates for non-trial scenarios.

            if (!isTrial) {
                // Determine commissionable start date for Premium users (handle mid-month upgrade)
                let commissionableStart: Date | null = null;

                // FIX: If plan is BASIC or null, we might still want commission?
                // The prompt implies "commission stays at 0", maybe because logic requires PREMIUM?
                // Assuming Commission applies to ALL non-trial bookings unless specified otherwise.
                // Re-reading logic: It seems it only enters the block if (sub && sub.plan_type === 'PREMIUM'...)
                // If the user has NO subscription or is BASIC, commissionableStart remains null.

                // If logic requires commission for EVERYONE except trial:
                // We should just calculate it.

                // However, the existing code had a check specifically for PREMIUM to determine start date.
                // Let's simplify: If not trial, calculate commission for all bookings.

                if (sub && sub.plan_type === 'PREMIUM' && sub.status === 'ACTIVE') {
                    // Match Owner Logic:
                    // If Premium, commission starts from the moment of upgrade/activation (updated_at).
                    // We do not wait for the original 30-day trial to expire if they upgraded early.
                    commissionableStart = new Date(sub.updated_at);
                }

                // FIX: If user is on BASIC or no plan, commissionableStart is null, 
                // meaning ALL bookings in this period are commissionable (default behavior).

                venueBookings.forEach(b => {
                    // Check if commissionable
                    let isCommissionable = true;
                    if (commissionableStart) {
                        const [bY, bM, bD] = b.date.split('-').map(Number);
                        const [startH, startM] = (b.start_time || '00:00').split(':').map(Number);
                        const bookingDateTime = new Date(bY, bM - 1, bD, startH, startM);

                        if (bookingDateTime < commissionableStart) {
                            isCommissionable = false;
                        }
                    }

                    if (isCommissionable) {
                        // Calculate duration in hours
                        let duration = 1; // Default
                        if (b.start_time && b.end_time) {
                            const [startH, startM] = b.start_time.split(':').map(Number);
                            const [endH, endM] = b.end_time.split(':').map(Number);
                            duration = (endH + endM / 60) - (startH + startM / 60);
                        }

                        // Minimal safeguard
                        if (duration <= 0) duration = 1;

                        totalCommission += duration * 5000;
                    }
                });
            }

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
                platform_commission: Math.round(totalCommission),
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

// ============================================
// PUSH NOTIFICATIONS
// ============================================

export const savePushSubscription = async (
    userId: string,
    subscription: PushSubscription
): Promise<boolean> => {
    try {
        const p256dh = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');

        if (!p256dh || !auth) {
            console.error('❌ Missing keys in subscription');
            return false;
        }

        const keys = {
            p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh) as any)),
            auth: btoa(String.fromCharCode.apply(null, new Uint8Array(auth) as any))
        };

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                keys: keys,
                user_agent: navigator.userAgent
            }, { onConflict: 'user_id, endpoint' });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Error saving push subscription:', error);
        return false;
    }
};
