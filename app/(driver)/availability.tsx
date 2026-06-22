import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { useSchedule, type DaySchedule, type TimeSlot } from '@/features/driver/useSchedule';
import type { ApiError } from '@/lib/api/client';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = typeof DAYS[number];

type WeekState = Record<DayKey, DaySchedule>;

function makeDefault(): WeekState {
  const entries = DAYS.map((d) => [d, { on: false, allday: false, slots: [] as TimeSlot[] }]);
  return Object.fromEntries(entries) as WeekState;
}

function DayRow({
  day,
  schedule,
  onToggle,
  onAlldayToggle,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  t,
}: {
  day: DayKey;
  schedule: DaySchedule;
  onToggle: () => void;
  onAlldayToggle: () => void;
  onAddSlot: () => void;
  onUpdateSlot: (i: number, patch: Partial<TimeSlot>) => void;
  onRemoveSlot: (i: number) => void;
  t: (k: string) => string;
}) {
  return (
    <View className="mb-4 rounded-xl border border-basalt-700 p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-white">
          {t(`driver.availability_${day}`)}
        </Text>
        <Pressable
          testID={`day-toggle-${day}`}
          onPress={onToggle}
          className={`h-6 w-10 rounded-full ${schedule.on ? 'bg-coral-500' : 'bg-basalt-700'}`}
        />
      </View>

      {schedule.on && (
        <>
          <Pressable
            testID={`allday-toggle-${day}`}
            onPress={onAlldayToggle}
            className="mb-3 flex-row items-center gap-2"
          >
            <View
              className={`h-4 w-4 items-center justify-center rounded border ${
                schedule.allday ? 'border-lagoon-500 bg-lagoon-500' : 'border-basalt-600'
              }`}
            >
              {schedule.allday && <Text className="text-[10px] text-white">✓</Text>}
            </View>
            <Text className="text-sm text-ink-300">{t('driver.availability_allday')}</Text>
          </Pressable>

          {!schedule.allday && (
            <>
              {schedule.slots.map((slot, si) => (
                <View key={si} className="mb-2 flex-row items-center gap-2">
                  <TextInput
                    className="flex-1 rounded border border-basalt-700 bg-basalt-800 px-2 py-1.5 text-sm text-white"
                    value={slot.start}
                    onChangeText={(v) => onUpdateSlot(si, { start: v })}
                    placeholder="09:00"
                    placeholderTextColor="#7d8ea3"
                  />
                  <Text className="text-ink-400">—</Text>
                  <TextInput
                    className="flex-1 rounded border border-basalt-700 bg-basalt-800 px-2 py-1.5 text-sm text-white"
                    value={slot.end}
                    onChangeText={(v) => onUpdateSlot(si, { end: v })}
                    placeholder="17:00"
                    placeholderTextColor="#7d8ea3"
                  />
                  <Pressable onPress={() => onRemoveSlot(si)} className="p-1">
                    <Text className="text-sm text-coral-400">×</Text>
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={onAddSlot} className="mt-1 self-start">
                <Text className="text-sm text-lagoon-400">
                  + {t('driver.availability_add_slot')}
                </Text>
              </Pressable>
            </>
          )}
        </>
      )}
    </View>
  );
}

export default function AvailabilityScreen() {
  const { t } = useTranslation();
  const saveSchedule = useSchedule();
  const [schedule, setSchedule] = useState<WeekState>(makeDefault);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  function updateDay(day: DayKey, patch: Partial<DaySchedule>) {
    setSchedule((s) => ({ ...s, [day]: { ...s[day], ...patch } }));
  }

  function addSlot(day: DayKey) {
    setSchedule((s) => ({
      ...s,
      [day]: { ...s[day], slots: [...s[day].slots, { start: '09:00', end: '17:00' }] },
    }));
  }

  function updateSlot(day: DayKey, index: number, patch: Partial<TimeSlot>) {
    setSchedule((s) => ({
      ...s,
      [day]: {
        ...s[day],
        slots: s[day].slots.map((sl, i) => (i === index ? { ...sl, ...patch } : sl)),
      },
    }));
  }

  function removeSlot(day: DayKey, index: number) {
    setSchedule((s) => ({
      ...s,
      [day]: { ...s[day], slots: s[day].slots.filter((_, i) => i !== index) },
    }));
  }

  async function onSave() {
    setStatus(null);
    try {
      await saveSchedule.mutateAsync(schedule);
      setStatus({ ok: true, msg: t('driver.availability_saved') });
    } catch (e) {
      setStatus({ ok: false, msg: (e as ApiError).message || t('driver.availability_save_failed') });
    }
  }

  return (
    <Screen dark scroll testID="availability-screen">
      <Text className="mb-5 text-xl font-bold text-white">{t('driver.availability_title')}</Text>

      {DAYS.map((day) => (
        <DayRow
          key={day}
          day={day}
          schedule={schedule[day]}
          onToggle={() => updateDay(day, { on: !schedule[day].on })}
          onAlldayToggle={() => updateDay(day, { allday: !schedule[day].allday })}
          onAddSlot={() => addSlot(day)}
          onUpdateSlot={(i, patch) => updateSlot(day, i, patch)}
          onRemoveSlot={(i) => removeSlot(day, i)}
          t={t}
        />
      ))}

      {status && (
        <Text
          testID="availability-status"
          className={`mb-3 text-sm ${status.ok ? 'text-lagoon-400' : 'text-coral-400'}`}
        >
          {status.msg}
        </Text>
      )}

      <Pressable
        testID="save-schedule-btn"
        onPress={() => { void onSave(); }}
        disabled={saveSchedule.isPending}
        className="mb-6 items-center rounded-full bg-lagoon-500 py-3 active:opacity-80"
      >
        {saveSchedule.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-sm font-semibold text-white">{t('driver.availability_save')}</Text>
        )}
      </Pressable>
    </Screen>
  );
}
