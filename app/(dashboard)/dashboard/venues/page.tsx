'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { Venue, Court } from '@/types';
import { createVenueWithCourts, updateVenue, addCourts, deleteCourt } from '@/services/dataService';
import { useOwnerVenues } from '@/hooks/useData';
import { ManageVenues } from '@/components/ManageVenues';
import { AddCourtModal } from '@/components/AddCourtModal';
import { Toast } from '@/components/Toast';

export default function VenuesPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const { venues, isLoading: isLoadingVenues, mutate } = useOwnerVenues(user?.id);
    const [showAddCourtModal, setShowAddCourtModal] = useState(false);
    const [venueToEdit, setVenueToEdit] = useState<Venue | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

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

    const handleEditVenue = (venue: Venue) => {
        setVenueToEdit(venue);
        setShowAddCourtModal(true);
    };

    const handleSaveVenue = async (
        venueName: string,
        venueAddress: string,
        openingHours: string,
        closedDays: number[],
        imageUrl: string,
        amenities: string[],
        contactInfo: string,
        newCourts: Omit<Court, 'id'>[],
        courtsToDelete: string[] = []
    ) => {
        if (!user) return;

        try {
            if (venueToEdit) {
                // Delete courts first if any
                if (courtsToDelete.length > 0) {
                    const deletePromises = courtsToDelete.map(courtId => deleteCourt(courtId));
                    await Promise.all(deletePromises);
                }

                // Update existing venue
                const updates: Partial<Omit<Venue, 'id' | 'courts' | 'owner_id'>> = {
                    name: venueName,
                    address: venueAddress,
                    opening_hours: openingHours,
                    closed_days: closedDays,
                    image_url: imageUrl,
                    amenities: amenities,
                    contact_info: contactInfo
                };

                const success = await updateVenue(venueToEdit.id, updates);

                if (success) {
                    if (newCourts.length > 0) {
                        await addCourts(venueToEdit.id, newCourts);
                    }
                    await mutate();
                    setToast({ message: 'Complejo actualizado correctamente', type: 'success' });
                    setVenueToEdit(null);
                } else {
                    throw new Error('Failed to update venue');
                }
            } else {
                // Create New Venue
                const success = await createVenueWithCourts(
                    {
                        owner_id: user.id,
                        name: venueName,
                        address: venueAddress,
                        image_url: imageUrl,
                        opening_hours: openingHours,
                        closed_days: closedDays,
                        amenities: amenities,
                        contact_info: contactInfo
                    },
                    newCourts
                );

                if (success) {
                    await mutate();
                    setToast({ message: '¡Complejo creado exitosamente!', type: 'success' });
                } else {
                    throw new Error('Failed to create venue');
                }
            }
        } catch (error: any) {
            console.error('Error saving venue:', error);
            if (error.message === 'DUPLICATE_VENUE_NAME') {
                setToast({ message: 'Ya existe un complejo con ese nombre.', type: 'error' });
            } else {
                setToast({ message: 'Error al guardar el complejo.', type: 'error' });
            }
        }
        setShowAddCourtModal(false); // Close modal
    };

    if (isLoading || isLoadingVenues) {
        return (
             <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user || user.role !== 'OWNER') return null;

    return (
        <main className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">Mis Complejos</h1>
                <button
                    onClick={() => {
                        setVenueToEdit(null);
                        setShowAddCourtModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Agregar Complejo
                </button>
            </div>

            <ManageVenues
                venues={venues}
                onVenueDeleted={() => mutate()}
                onEditVenue={handleEditVenue}
            />

            {showAddCourtModal && (
                <AddCourtModal
                    currentVenueName={venueToEdit?.name || ''}
                    currentVenueAddress={venueToEdit?.address || ''}
                    currentOpeningHours={venueToEdit?.opening_hours || '08:00 - 22:00'}
                    currentClosedDays={venueToEdit?.closed_days || []}
                    currentImageUrl={venueToEdit?.image_url || ''}
                    currentAmenities={venueToEdit?.amenities || []}
                    currentContactInfo={venueToEdit?.contact_info || ''}
                    currentCourts={venueToEdit?.courts || []}
                    onClose={() => setShowAddCourtModal(false)}
                    onSave={handleSaveVenue}
                />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}
