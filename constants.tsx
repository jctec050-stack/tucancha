
import { Venue } from './types';

export const MOCK_VENUES: Venue[] = [
  {
    id: 'v1',
    ownerId: 'owner1',
    name: 'Padel Arena Pro',
    address: 'Calle Mayor 45, Madrid',
    imageUrl: 'https://images.unsplash.com/photo-1626225447230-e54703a11d95?q=80&w=800&auto=format&fit=crop',
    openingHours: '08:00 - 23:00',
    courts: [
      { id: 'c1', name: 'Cancha Central (Cristal)', type: 'Padel', pricePerHour: 25 },
      { id: 'c2', name: 'Cancha 2', type: 'Padel', pricePerHour: 20 },
      { id: 'c3', name: 'Cancha Arena 1', type: 'Beach Tennis', pricePerHour: 15 },
    ]
  },
  {
    id: 'v2',
    ownerId: 'owner2',
    name: 'Beach Tennis Club Sun',
    address: 'Playa del Sol 12, Valencia',
    imageUrl: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?q=80&w=800&auto=format&fit=crop',
    openingHours: '07:00 - 21:00',
    courts: [
      { id: 'c4', name: 'Pista Oceano', type: 'Beach Tennis', pricePerHour: 18 },
      { id: 'c5', name: 'Pista Palmera', type: 'Beach Tennis', pricePerHour: 18 },
    ]
  }
];

export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];
