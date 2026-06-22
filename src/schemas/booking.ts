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

export const fullBookingSchema = z.object({
  pickup: z.object({ name: z.string().min(1), lat: z.number(), lng: z.number() }),
  dropoff: z.object({ name: z.string().min(1), lat: z.number(), lng: z.number() }),
  rider_name: z.string().trim().min(1),
  rider_phone: z.string().trim().min(7),
  rider_email: z.string().email().optional().or(z.literal('')),
  vehicle: z.enum(['sedan', 'van', 'minibus']).default('sedan'),
  vehicle_preference: z.string().default(''),
  distance_km: z.number().min(0),
  duration_min: z.number().min(0),
  fare_mur: z.number().min(0),
  notes: z.string().default(''),
  mr_hp_field: z.string().default(''),
  mr_form_ts: z.number().int(),
});

export type FullBookingInput = z.infer<typeof fullBookingSchema>;
