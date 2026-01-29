import React, { useState } from 'react';
import { Venue } from '../types';
import { deleteVenue } from '../services/dataService';

import { ConfirmationModal } from './ConfirmationModal';

interface ManageVenuesProps {
    venues: Venue[];
    onVenueDeleted: () => void;
    onEditVenue: (venue: Venue) => void;
}

export const ManageVenues: React.FC<ManageVenuesProps> = ({ venues, onVenueDeleted, onEditVenue }) => {
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);

    const confirmDelete = (venue: Venue) => {
        setVenueToDelete(venue);
    };

    const performDelete = async () => {
        if (!venueToDelete) return;

        setIsDeleting(venueToDelete.id);
        const success = await deleteVenue(venueToDelete.id);

        if (success) {
            onVenueDeleted();
        } else {
            console.error('Failed to delete');
        }
        setIsDeleting(null);
        setVenueToDelete(null);
    };

    if (venues.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No tienes complejos registrados.
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue) => (
                    <div key={venue.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="h-48 overflow-hidden relative bg-gray-50">
                            {venue.image_url ? (
                                <img src={venue.image_url} alt={venue.name} className="w-full h-full object-contain p-4" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm">
                                {venue.courts.length} Canchas
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{venue.name}</h3>
                            <p className="text-gray-500 text-sm mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {venue.address || 'Sin dirección'}
                            </p>

                            <div className="mt-auto pt-4 border-t border-gray-50 flex justify-end gap-2">
                                <button
                                    onClick={() => onEditVenue(venue)}
                                    className="flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Editar
                                </button>
                                <button
                                    onClick={() => confirmDelete(venue)}
                                    disabled={isDeleting === venue.id}
                                    className="flex items-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                                >
                                    {isDeleting === venue.id ? 'Eliminando...' : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Eliminar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {venueToDelete && (
                <ConfirmationModal
                    isOpen={!!venueToDelete}
                    title="¿Eliminar Complejo?"
                    message={`¿Estás seguro de que deseas eliminar "${venueToDelete.name}"? Esta acción borrará todas las canchas y reservas asociadas.`}
                    confirmText="Sí, Eliminar"
                    cancelText="Cancelar"
                    isDangerous={true}
                    onConfirm={performDelete}
                    onCancel={() => setVenueToDelete(null)}
                />
            )}
        </>
    );
};
