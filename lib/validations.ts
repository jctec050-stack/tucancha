import { z } from 'zod';

// Helper for time validation (HH:mm)
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const BookingSchema = z.object({
  venue_id: z.string().uuid({ message: "ID de complejo inválido" }),
  court_id: z.string().uuid({ message: "ID de cancha inválido" }),
  player_id: z.string().uuid({ message: "ID de jugador inválido" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato de fecha inválido (YYYY-MM-DD)" }).refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime());
  }, { message: "Fecha inválida" }),
  start_time: z.string().regex(timeRegex, { message: "Formato de hora inválido (HH:mm)" }).refine((time) => {
    // Enforce round hours (e.g., 14:00, 15:00) as per business logic
    const [_, minutes] = time.split(':');
    return minutes === '00';
  }, { message: "Las reservas solo se permiten en horas exactas (ej: 14:00, 15:00)" }),
  end_time: z.string().regex(timeRegex, { message: "Formato de hora inválido (HH:mm)" }).optional(),
  price: z.number().int().positive({ message: "El precio debe ser un número positivo" }),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'ACTIVE']).optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'PARTIAL', 'REFUNDED']).optional(),
  // Optional fields for manual bookings and recurring bookings
  player_name: z.string().optional(),
  player_phone: z.string().optional(),
  notes: z.string().optional(),
});

export const ProfileSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(6, "El teléfono es muy corto").optional(),
  email: z.string().email("Email inválido")
});

export type BookingInput = z.infer<typeof BookingSchema>;
