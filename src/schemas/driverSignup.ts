import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const step1Schema = z.object({
  firstname: z.string().min(1),
  surname: z.string().min(1),
  email: z.string().email(),
  mobile: z.string().regex(/^5\d{6,7}$/),
});

export const step2Schema = z.object({
  nid: z.string().regex(/^[A-Za-z0-9]{13}$/),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  address: z.string().min(3),
});

export const step3Schema = z.object({
  vehicle_make: z.string().min(1),
  vehicle_make_other: z.string().optional(),
  vehicle_model: z.string().min(1),
  vehicle_year: z.coerce.number().int().min(2012).max(currentYear),
  vehicle_colour: z.string().min(1),
  vehicle_plate: z.string().min(1),
  vehicle_capacity: z.enum(['4', '5', '6', '7']),
});

export const step4Schema = z.object({
  consent_verify: z.literal(true),
  consent_commission: z.literal(true),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type DriverSignupPayload = Step1Data & Step2Data & Step3Data;
