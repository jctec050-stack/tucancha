'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { Venue, Booking, DisabledSlot } from '@/types';
import { getVenues, getBookings, getDisabledSlots } from '@/services/dataService';
import { OwnerDashboard } from '@/components/OwnerDashboard';

export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [venues, setVenues] = useState<Venue[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [disabledSlots, setDisabledSlots] = useState<DisabledSlot[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
            return;
        }
        if (!isLoading && user?.role !== 'OWNER') {
            router.push('/');
            return;
        }
    }, [user, isLoading, router]);

    // Initial fetch for Venues and Bookings (Run once)
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) return;
            try {
                setLoadingData(true);
                const fetchedVenues = await getVenues(user.id);
                setVenues(fetchedVenues);
                
                // TODO: Optimize fetching by date range if dataset grows
                const fetchedBookings = await getBookings(user.id);
                setBookings(fetchedBookings);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoadingData(false);
            }
        };

        if (user?.role === 'OWNER') {
            fetchInitialData();
        }
    }, [user]);

    // Fetch Disabled Slots when Date or Venue changes
    useEffect(() => {
        const fetchDisabledSlots = async () => {
            if (venues.length === 0) return;
            try {
                setLoadingSlots(true);
                // Currently fetching for first venue. 
                // Future: If we add venue selector, use selectedVenue.id
                const fetchedDisabledSlots = await getDisabledSlots(venues[0].id, selectedDate);
                setDisabledSlots(fetchedDisabledSlots);
            } catch (error) {
                console.error('Error fetching disabled slots:', error);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchDisabledSlots();
    }, [selectedDate, venues]);

    if (isLoading || loadingData) {
        return (
             <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user || user.role !== 'OWNER') return null;

    if (venues.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                 <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                    <div className="inline-block p-4 bg-indigo-100 rounded-2xl text-indigo-600 mb-4">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes complejos registrados</h3>
                    <p className="text-gray-500 mb-6">Debes crear un complejo primero.</p>
                    <button
                        onClick={() => router.push('/dashboard/venues')}
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                    >
                        Ir a Mis Complejos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Dashboard</h1>
            <OwnerDashboard
                bookings={bookings}
                disabledSlots={disabledSlots}
                venue={venues[0]} // Currently showing first venue, could add selector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
            />
        </main>
    );
}
