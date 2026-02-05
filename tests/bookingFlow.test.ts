import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooking, getDisabledSlots, createDisabledSlot } from '@/services/dataService';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types';

// Mock Supabase methods
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

// Mock implementation of supabase chain
vi.mock('@/lib/supabase', () => {
    const chain = {
        from: vi.fn(() => chain),
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        maybeSingle: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
    };
    return { supabase: chain };
});

describe('Flujo de Reserva: Integración', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockBooking: Omit<Booking, 'id' | 'created_at' | 'updated_at'> = {
        venue_id: 'venue-123',
        court_id: 'court-456',
        player_id: 'player-789',
        date: '2026-05-20',
        start_time: '18:00',
        end_time: '19:00',
        price: 100000,
        status: 'ACTIVE',
        payment_status: 'PENDING'
    };

    it('Debe crear una reserva exitosamente si el horario está libre', async () => {
        // Configurar Mock para INSERT exitoso
        const mockSuccessResponse = { 
            data: { ...mockBooking, id: 'new-booking-id' }, 
            error: null 
        };
        
        // Simular que el insert devuelve data
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'bookings') {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue(mockSuccessResponse)
                };
            }
            if (table === 'venues') { // Para la notificación
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { name: 'Test Venue', owner_id: 'owner-1' } })
                };
            }
            return { insert: vi.fn().mockResolvedValue({}) }; // Notifications fallback
        });

        const result = await createBooking(mockBooking);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('new-booking-id');
        expect(result.data?.status).toBe('ACTIVE');
    });

    it('Debe fallar al crear reserva si el horario está ocupado (Constraint Violada)', async () => {
        // Simular error de violación de constraint (Unique Booking)
        const mockErrorResponse = { 
            data: null, 
            error: { code: '23505', message: 'Duplicate key value violates unique constraint' } 
        };

        (supabase.from as any).mockImplementation(() => ({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue(mockErrorResponse)
        }));

        const result = await createBooking(mockBooking);

        expect(result.success).toBe(false);
        expect(result.error).toBe('HORARIO_OCUPADO');
    });

    it('Debe permitir bloquear un horario (Disabled Slot)', async () => {
        const mockSlot = {
            venue_id: 'venue-123',
            court_id: 'court-456',
            date: '2026-05-20',
            time_slot: '20:00',
            reason: 'Mantenimiento'
        };

        const mockResponse = { data: { ...mockSlot, id: 'slot-1' }, error: null };

        (supabase.from as any).mockImplementation(() => ({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue(mockResponse)
        }));

        const result = await createDisabledSlot(mockSlot as any);

        expect(result).not.toBeNull();
        expect(result?.time_slot).toBe('20:00');
    });
});
