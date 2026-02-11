'use client';

import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export const ReloadPrompt = () => {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            const handleControllerChange = () => {
                // Prevent duplicate toasts if rapid fires
                toast((t) => (
                    <div className="flex flex-col gap-2">
                        <span className="font-medium">✨ Nueva actualización disponible</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    window.location.reload();
                                }}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition"
                            >
                                Actualizar Ahora
                            </button>
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="text-gray-500 px-3 py-1.5 text-sm hover:text-gray-700"
                            >
                                Después
                            </button>
                        </div>
                    </div>
                ), {
                    duration: Infinity, // Stay until clicked
                    position: 'bottom-right',
                    id: 'sw-update-toast', // Unique ID to prevent duplicates
                    style: {
                        minWidth: '250px',
                    }
                });
            };

            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

            return () => {
                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            };
        }
    }, []);

    return null;
};
