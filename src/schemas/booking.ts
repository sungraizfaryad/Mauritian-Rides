import { z } from 'zod';

export const pickupSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  label: z.string().min(1),
});

export const createBookingSchema = z.object({
  pickup: pickupSchema,
  dropoff: z.string().trim().min(1),
  passengers: z.number().int().min(1).max(8),
});

export type Pickup = z.infer<typeof pickupSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
