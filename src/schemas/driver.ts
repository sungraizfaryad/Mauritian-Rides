import { z } from 'zod';

export const locationUpdateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  heading: z.number(),
  accuracy: z.number(),
});
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

export const documentUploadSchema = z.object({
  slug: z.string().trim().min(1),
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
