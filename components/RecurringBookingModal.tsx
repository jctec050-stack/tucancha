import React, { useState } from 'react';
import { Court, Booking } from '@/types';
import { createRecurringBookings, getProfileByEmail } from '@/services/dataService';
import { TIME_SLOTS } from '@/constants';

interface RecurringBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    venueId: string;
    courts: Court[];
    onSuccess: (message: string) => void;
}

export const RecurringBookingModal: React.FC<RecurringBookingModalProps> = ({
    isOpen,
    onClose,
    venueId,
    courts,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [playerEmail, setPlayerEmail] = useState('');
    const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id || '');
    const [dayOfWeek, setDayOfWeek] = useState<number>(new Date().getDay());
    const [startTime, setStartTime] = useState('18:00');
    const [endTime, setEndTime] = useState('19:00'); // Default 1 hour
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
    });
    const [price, setPrice] = useState<number>(courts[0]?.price_per_hour || 0);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const days = [
        { value: 0, label: 'Domingo' },
        { value: 1, label: 'Lunes' },
        { value: 2, label: 'Martes' },
        { value: 3, label: 'Miércoles' },
        { value: 4, label: 'Jueves' },
        { value: 5, label: 'Viernes' },
        { value: 6, label: 'Sábado' },
    ];

    const calculateTurnCount = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;
        // Clone start to avoid modifying state reference if it were an object (it's a string here but good practice for Date loop)
        const current = new Date(start);
        while (current <= end) {
            if (current.getDay() === dayOfWeek) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    };
    
    const turnCount = calculateTurnCount();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // 1. Find Player
            const player = await getProfileByEmail(playerEmail);
            if (!player) {
                setError('Jugador no encontrado con ese email.');
                setLoading(false);
                return;
            }

            // 2. Prepare Booking Template
            const bookingTemplate = {
                venue_id: venueId,
                court_id: selectedCourtId,
                player_id: player.id,
                start_time: startTime,
                end_time: endTime,
                price: price,
                status: 'ACTIVE' as const,
                payment_status: 'PENDING' as const,
                notes: 'Reserva Recurrente'
            };

            // 3. Create Bookings
            const result = await createRecurringBookings(
                bookingTemplate,
                startDate,
                endDate,
                dayOfWeek
            );

            if (result.success > 0) {
                onSuccess(`Se crearon ${result.success} reservas exitosamente.${result.failures > 0 ? ` Fallaron ${result.failures} (posiblemente horarios ocupados).` : ''}`);
                onClose();
            } else {
                setError('No se pudo crear ninguna reserva. Verifique si los horarios están disponibles.');
            }

        } catch (err) {
            console.error(err);
            setError('Error al procesar la solicitud.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Crear Reserva Mensual</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email del Jugador</label>
                        <input
                            type="email"
                            required
                            value={playerEmail}
                            onChange={(e) => setPlayerEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            placeholder="ejemplo@email.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cancha</label>
                            <select
                                value={selectedCourtId}
                                onChange={(e) => {
                                    const court = courts.find(c => c.id === e.target.value);
                                    setSelectedCourtId(e.target.value);
                                    if (court) setPrice(court.price_per_hour);
                                }}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {courts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
                            <select
                                value={dayOfWeek}
                                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {days.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                            <input
                                type="date"
                                required
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
                            <select
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {TIME_SLOTS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                            <select
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {TIME_SLOTS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio Total (Paquete Mensual)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <span className="font-medium text-indigo-600">{turnCount} fechas</span> 
                            <span>x ${(price / (turnCount || 1)).toFixed(2)} c/u</span>
                        </p>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Procesando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
