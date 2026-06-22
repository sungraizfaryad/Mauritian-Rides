import { Screen } from '@/components/ui/Screen';
import { BookingFlow } from '@/features/bookings/BookingFlow';

export default function GuestBook() {
  return (
    <Screen>
      <BookingFlow guestMode />
    </Screen>
  );
}
