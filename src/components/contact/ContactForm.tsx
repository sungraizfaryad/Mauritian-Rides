import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TopicSelect, Topic } from './TopicSelect';

const AJAX_URL =
  (process.env.EXPO_PUBLIC_WP_URL?.replace('/wp-json/wp/v2', '') ?? 'http://mauritianrides.local') +
  '/wp-admin/admin-ajax.php';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const { t } = useTranslation();

  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const topics: Topic[] = [
    { value: 'booking', label: t('contact.topic_booking') },
    { value: 'driver', label: t('contact.topic_driver') },
    { value: 'existing', label: t('contact.topic_existing') },
    { value: 'other', label: t('contact.topic_other') },
  ];

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`${AJAX_URL}?action=mr_contact_token`);
      const json = await res.json() as { token?: string };
      if (json.token) setToken(json.token);
    } catch {
      // silent — form will fail on submit if token is empty
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${AJAX_URL}?action=mr_contact_token`)
      .then((r) => r.json())
      .then((json: { token?: string }) => {
        if (!cancelled && json.token) setToken(json.token);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const validate = (): string | null => {
    if (name.trim().length < 2) return t('contact.form_error_name');
    if (!EMAIL_RE.test(email.trim())) return t('contact.form_error_email');
    if (message.trim().length < 10) return t('contact.form_error_message');
    return null;
  };

  const handleSubmit = async () => {
    setBanner(null);
    const err = validate();
    if (err) { setFieldError(err); return; }
    setFieldError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.append('action', 'mr_contact');
      fd.append('mr_name', name.trim());
      fd.append('mr_email', email.trim());
      fd.append('mr_phone', phone.trim());
      fd.append('mr_subject', topic);
      fd.append('mr_message', message.trim());
      fd.append('mr_token', token);
      fd.append('mr_website', ''); // honeypot

      const res = await fetch(AJAX_URL, { method: 'POST', body: fd });
      const json = await res.json() as { success: boolean; data?: { message?: string } };
      if (json.success) {
        setBanner({ type: 'success', text: json.data?.message ?? t('contact.form_success') });
        setName(''); setPhone(''); setEmail(''); setTopic(''); setMessage('');
        fetchToken();
      } else {
        setBanner({ type: 'error', text: json.data?.message ?? t('contact.form_error_generic') });
      }
    } catch {
      setBanner({ type: 'error', text: t('contact.form_error_generic') });
    } finally {
      setPending(false);
    }
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#d4c9b3',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0a0f14',
    backgroundColor: '#fff',
    marginBottom: 12,
  };

  return (
    <View style={{ paddingTop: 24 }}>
      {banner ? (
        <View style={{ borderRadius: 10, padding: 14, marginBottom: 16, backgroundColor: banner.type === 'success' ? '#e6faf9' : '#fff1ee', borderWidth: 1, borderColor: banner.type === 'success' ? '#0bb8ad' : '#ff7a54' }}>
          <Text style={{ color: banner.type === 'success' ? '#0bb8ad' : '#ee5a30', fontSize: 14, fontWeight: '600' }}>{banner.text}</Text>
        </View>
      ) : null}

      {fieldError ? (
        <View style={{ borderRadius: 10, padding: 12, marginBottom: 16, backgroundColor: '#fff1ee', borderWidth: 1, borderColor: '#ff7a54' }}>
          <Text style={{ color: '#ee5a30', fontSize: 14 }}>{fieldError}</Text>
        </View>
      ) : null}

      <TextInput
        style={inputStyle}
        placeholder={t('contact.form_name_required')}
        placeholderTextColor="#9aa3b0"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        testID="contact-name"
      />

      <TextInput
        style={inputStyle}
        placeholder={t('contact.form_phone')}
        placeholderTextColor="#9aa3b0"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        testID="contact-phone"
      />

      <TextInput
        style={inputStyle}
        placeholder={t('contact.form_email')}
        placeholderTextColor="#9aa3b0"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        testID="contact-email"
      />

      <View style={{ marginBottom: 12 }}>
        <TopicSelect
          topics={topics}
          selected={topic}
          placeholder={t('contact.form_topic')}
          onChange={setTopic}
        />
      </View>

      <TextInput
        style={{ ...inputStyle, minHeight: 100, textAlignVertical: 'top' }}
        placeholder={t('contact.form_message_ph')}
        placeholderTextColor="#9aa3b0"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
        testID="contact-message"
      />

      <Pressable
        onPress={handleSubmit}
        disabled={pending}
        style={{ backgroundColor: pending ? '#9aa3b0' : '#0bb8ad', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 }}
        testID="contact-submit"
      >
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('contact.form_submit')}</Text>
        )}
      </Pressable>

      <Text style={{ fontSize: 12, color: '#9aa3b0', textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
        {t('contact.form_note')}
      </Text>
    </View>
  );
}
