import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooking } from '@/services/dataService';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types';

// Mock implementation of supabase chain
vi.mock('@/lib/supabase', () => {
    const chain = {
        from: vi.fn(() => chain),
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        neq: vi.fn(() => chain), // Added neq
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        maybeSingle: vi.fn(() => chain),
        limit: vi.fn(() => chain),
    };
    return { supabase: chain };
});

describe('Validación y Seguridad de Reservas', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockBooking: Omit<Booking, 'id' | 'created_at' | 'updated_at'> = {
        venue_id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
        court_id: '123e4567-e89b-12d3-a456-426614174001',
        player_id: '123e4567-e89b-12d3-a456-426614174002',
        date: '2026-05-20',
        start_time: '14:00',
        end_time: '15:00',
        price: 100000,
        status: 'ACTIVE',
        payment_status: 'PENDING'
    };

    it('Debe rechazar horarios no redondos (Ej: 14:30)', async () => {
         const badBooking = { ...mockBooking, start_time: '14:30' };
         
         // Mock empty existing bookings to pass overlap check if it got there
         (supabase.from as any).mockImplementation(() => ({
             select: vi.fn().mockReturnThis(),
             eq: vi.fn().mockReturnThis(),
             neq: vi.fn().mockResolvedValue({ data: [] }),
         }));

         const result = await createBooking(badBooking);
         
         expect(result.success).toBe(false);
         // The error message from Zod
         expect(result.error).toContain('horas exactas');
    });

    it('Debe rechazar solapamiento de horarios (Overlap)', async () => {
        // Existing booking: 14:00 - 15:00
        const existingBookings = [{ start_time: '14:00', end_time: '15:00' }];
        
        (supabase.from as any).mockImplementation((table: string) => {
             if (table === 'bookings') {
                 return {
                     select: vi.fn().mockReturnThis(),
                     eq: vi.fn().mockReturnThis(),
                     neq: vi.fn().mockResolvedValue({ data: existingBookings }), // Return overlap
                     insert: vi.fn().mockReturnThis(),
                     single: vi.fn().mockResolvedValue({ data: null })
                 };
             }
             return { 
                 select: vi.fn().mockReturnThis(), 
                 single: vi.fn().mockResolvedValue({ data: {} }),
                 eq: vi.fn().mockReturnThis()
             };
        });

        // New booking: 14:00 - 15:00 (Exact Overlap)
        const result = await createBooking(mockBooking);
        expect(result.success).toBe(false);
        expect(result.error).toBe('HORARIO_OCUPADO');
    });

    it('Debe rechazar solapamiento parcial (Ej: 14:30 en reserva de 14:00-15:00)', async () => {
        // Even if validation allowed 14:30, overlap logic should catch it if we bypassed validation
        // But since validation is first, we test with valid times that overlap.
        // Existing: 14:00 - 16:00
        const existingBookings = [{ start_time: '14:00', end_time: '16:00' }];

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'bookings') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    neq: vi.fn().mockResolvedValue({ data: existingBookings }),
                    insert: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: null })
                };
            }
            return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({}) };
       });

       // New: 15:00 - 16:00 (Overlap!)
       // Wait, 14-16 overlaps with 15-16? Yes.
       const result = await createBooking({ ...mockBooking, start_time: '15:00', end_time: '16:00' });
       expect(result.success).toBe(false);
       expect(result.error).toBe('HORARIO_OCUPADO');
   });
});
