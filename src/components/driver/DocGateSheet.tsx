import { useState } from 'react';
import { Modal, View, Text, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

const STEPS = ['headshot', 'nid', 'licence', 'psv'] as const;
type Step = typeof STEPS[number];

interface DocGateSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}

function StepDots({ current }: { current: number }) {
  return (
    <View className="mb-6 flex-row justify-center gap-2">
      {STEPS.map((s, i) => (
        <View
          key={s}
          className={`h-2 rounded-full transition-all ${
            i < current
              ? 'w-2 bg-lagoon-500'
              : i === current
              ? 'w-5 bg-sunset-500'
              : 'w-2 bg-basalt-700'
          }`}
        />
      ))}
    </View>
  );
}

const STEP_LABELS: Record<Step, { title: string; sub: string }> = {
  headshot: { title: 'driver.doc_step_headshot_title', sub: 'driver.doc_step_headshot_sub' },
  nid:      { title: 'driver.doc_step_nid_title',      sub: 'driver.doc_step_nid_sub' },
  licence:  { title: 'driver.doc_step_licence_title',  sub: 'driver.doc_step_licence_sub' },
  psv:      { title: 'driver.doc_step_psv_title',      sub: 'driver.doc_step_psv_sub' },
};

interface StepViewProps {
  step: Step;
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  t: (key: string) => string;
}

function StepView({ step, stepIndex, onNext, onBack, onClose, onSubmit, submitting, t }: StepViewProps) {
  const cfg = STEP_LABELS[step];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const isNid = step === 'nid';

  return (
    <>
      <StepDots current={stepIndex} />
      <Text className="text-xl font-bold text-white">{t(cfg.title)}</Text>
      <Text className="mt-1 text-sm text-ink-400">{t(cfg.sub)}</Text>

      {isNid ? (
        <View className="mt-5 flex-row gap-3">
          <Pressable
            testID="doc-upload-nid-front"
            className="flex-1 items-center justify-center rounded-xl border border-dashed border-basalt-600 bg-basalt-800 py-8 active:opacity-70"
            onPress={() => Alert.alert(t('driver.doc_choose_file'))}
          >
            <Text className="text-2xl">📄</Text>
            <Text className="mt-2 text-xs text-ink-400">{t('driver.doc_nid_front')}</Text>
          </Pressable>
          <Pressable
            testID="doc-upload-nid-back"
            className="flex-1 items-center justify-center rounded-xl border border-dashed border-basalt-600 bg-basalt-800 py-8 active:opacity-70"
            onPress={() => Alert.alert(t('driver.doc_choose_file'))}
          >
            <Text className="text-2xl">📄</Text>
            <Text className="mt-2 text-xs text-ink-400">{t('driver.doc_nid_back')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID={`doc-upload-${step}`}
          className="mt-5 items-center justify-center rounded-xl border border-dashed border-basalt-600 bg-basalt-800 py-10 active:opacity-70"
          onPress={() => Alert.alert(t('driver.doc_choose_file'))}
        >
          <Text className="text-3xl">📷</Text>
          <Text className="mt-3 text-sm text-ink-400">{t('driver.doc_choose_file')}</Text>
        </Pressable>
      )}

      <View className="mt-6 flex-row gap-3">
        {!isFirst ? (
          <Pressable
            onPress={onBack}
            className="flex-1 items-center rounded-full border border-basalt-600 py-3"
          >
            <Text className="text-sm text-ink-300">{t('common.back')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onClose}
            className="flex-1 items-center rounded-full border border-basalt-600 py-3"
          >
            <Text className="text-sm text-ink-300">{t('common.cancel')}</Text>
          </Pressable>
        )}

        <Pressable
          testID={isLast ? 'doc-gate-submit' : 'doc-gate-next'}
          onPress={isLast ? onSubmit : onNext}
          disabled={submitting}
          className="flex-1 items-center rounded-full bg-lagoon-500 py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-white">
            {isLast ? t('driver.doc_submit') : t('driver.doc_next')}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

export function DocGateSheet({ visible, onClose, onSubmit, submitting = false }: DocGateSheetProps) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);

  const step = STEPS[stepIndex] as Step;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-basalt-950 px-5 py-6">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="font-mono text-xs uppercase tracking-widest text-ink-400">
            {t('driver.doc_gate_eyebrow')}
          </Text>
          <Pressable onPress={onClose} className="p-1">
            <Text className="text-ink-400">✕</Text>
          </Pressable>
        </View>

        <StepView
          step={step}
          stepIndex={stepIndex}
          onNext={() => setStepIndex((i: number) => Math.min(i + 1, STEPS.length - 1))}
          onBack={() => setStepIndex((i: number) => Math.max(i - 1, 0))}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
          t={t}
        />
      </View>
    </Modal>
  );
}
