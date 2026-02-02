
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
        // Note: Including times for duration calculation
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, venue_id, court_id, price, status, payment_status, start_time, end_time')
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

            // Calculate total revenue (Gross for Owner)
            const totalRevenue = venueBookings.reduce((sum, b) => sum + (b.price || 0), 0);

            // Calculate Platform Commission: 5.000 Gs per Hour Booked
            let totalCommission = 0;
            venueBookings.forEach(b => {
                if (b.start_time && b.end_time) {
                    const [startH, startM] = b.start_time.split(':').map(Number);
                    const [endH, endM] = b.end_time.split(':').map(Number);

                    // Duration calculate (handling minutes properly)
                    let duration = (endH + endM / 60) - (startH + startM / 60);

                    // Sanity check: ensure duration is positive, fallback to 1h
                    if (duration <= 0) duration = 1;

                    // Formula: Hours * 5000
                    totalCommission += duration * 5000;
                } else {
                    // Fallback to 1 hour (5000) if raw data is missing times
                    totalCommission += 5000;
                }
            });

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
                platform_commission: totalCommission, // New metric
                revenue_by_court: revenueByCourt
            };
        });

        return adminData;
    } catch (error) {
        console.error('❌ Error fetching admin data:', error);
        return [];
    }
};
