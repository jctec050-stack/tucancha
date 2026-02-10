import useSWR from 'swr';
import { getVenues, getBookings, getDisabledSlots } from '@/services/dataService';
import { Venue, Booking, DisabledSlot } from '@/types';

// Fetcher functions
const venuesFetcher = () => getVenues();
const disabledSlotsFetcher = (key: string[]) => {
    const [_, venueId, date] = key;
    return getDisabledSlots(venueId, date);
};

// Updated fetcher to handle object return, but useSWR expects the data directly mostly.
// Actually, we will define specific fetchers inside hooks or generic ones.

export function useVenues() {
    const { data, error, isLoading, mutate } = useSWR<Venue[]>('venues', venuesFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    return {
        venues: data || [],
        isLoading,
        isError: error,
        mutate
    };
}

export function useOwnerVenues(ownerId: string | undefined) {
    const { data, error, isLoading, mutate } = useSWR<Venue[]>(
        ownerId ? ['venues', ownerId] : null,
        () => getVenues(ownerId),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        venues: data || [],
        isLoading,
        isError: error,
        mutate
    };
}

interface UseBookingsOptions {
    ownerId?: string;
    playerId?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
}

export function useBookings(options: UseBookingsOptions = {}) {
    // Unique key based on options
    const key = ['bookings', JSON.stringify(options)];

    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => getBookings(options),
        {
            revalidateOnFocus: true,
            dedupingInterval: 10000,
            keepPreviousData: true, // Good for pagination UI
        }
    );

    return {
        bookings: data?.data || [],
        totalCount: data?.count || 0,
        isLoading,
        isError: error,
        mutate
    };
}

export function useOwnerBookings(ownerId: string | undefined, page = 1, limit = 20) {
    const { bookings, totalCount, isLoading, isError, mutate } = useBookings({
        ownerId,
        page,
        limit
    });

    return {
        bookings,
        totalCount,
        isLoading,
        isError,
        mutate
    };
}

export function usePlayerBookings(userId?: string, page = 1, limit = 20) {
    // Now we filter on server side!
    const { bookings, totalCount, isLoading, isError, mutate } = useBookings({
        playerId: userId,
        page,
        limit
    });

    return {
        bookings,
        totalCount,
        isLoading,
        isError,
        mutate
    };
}

export function useBookingsByDate(ownerId: string | undefined, date: string) {
    const { bookings, isLoading, isError, mutate } = useBookings({
        ownerId,
        startDate: date,
        endDate: date,
        limit: 1000 // High limit ensures we get all bookings for the day view
    });

    return {
        bookings,
        isLoading,
        isError,
        mutate
    };
}

export function useMonthlyBookings(ownerId: string | undefined, selectedMonth: string) {
    // selectedMonth format: "YYYY-MM"
    const [year, month] = selectedMonth.split('-').map(Number);

    // Calculate first and last day of the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

    // Calculate last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { bookings, isLoading, isError, mutate } = useBookings({
        ownerId,
        startDate,
        endDate,
        limit: 5000 // High limit to get all bookings for the month
    });

    return {
        bookings,
        isLoading,
        isError,
        mutate
    };
}

export function useBookingsForChart(ownerId: string | undefined, endDate: string) {
    // Get bookings for the last 7 days (from endDate - 6 days to endDate)
    // Calculate start date (6 days before endDate)
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const startDate = start.toISOString().split('T')[0];

    const { bookings, isLoading, isError, mutate } = useBookings({
        ownerId,
        startDate,
        endDate,
        limit: 1000 // High limit to get all bookings for the week
    });

    return {
        bookings,
        isLoading,
        isError,
        mutate
    };
}


export function useDisabledSlots(venueId: string | null, date: string | null) {
    const shouldFetch = venueId && date;
    const { data, error, isLoading, mutate } = useSWR<DisabledSlot[]>(
        shouldFetch ? ['disabledSlots', venueId, date] : null,
        disabledSlotsFetcher as any, // Type casting to satisfy SWR generic
        {
            revalidateOnFocus: false,
        }
    );

    return {
        disabledSlots: data || [],
        isLoading,
        isError: error,
        mutate
    };
}
