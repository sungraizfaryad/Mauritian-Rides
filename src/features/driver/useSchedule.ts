import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  on: boolean;
  allday: boolean;
  slots: TimeSlot[];
}

export type WeekSchedule = Record<string, DaySchedule>;

export function useSchedule() {
  return useMutation({
    mutationFn: async (days: WeekSchedule) => {
      const { data } = await api.post<{ saved: boolean }>('/driver/me/schedule', { days });
      return data;
    },
  });
}
