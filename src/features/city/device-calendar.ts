import { Platform } from 'react-native';
import { validateEntry, type CalendarEntry } from './calendar-export';

export async function addToDeviceCalendar(entry: CalendarEntry) {
  const { start, end } = validateEntry(entry);
  if (Platform.OS === 'web') throw new Error('Deschide aplicația iOS/Android sau alege Google, Outlook ori fișierul .ics.');
  const Calendar = await import('expo-calendar');
  const permission = await Calendar.requestCalendarPermissions(Platform.OS === 'ios');
  if (permission.status !== 'granted') throw new Error('Accesul la calendar nu a fost acordat. Îl poți activa din setările telefonului sau poți alege Google / Outlook.');
  let calendar;
  if (Platform.OS === 'ios') calendar = Calendar.getDefaultCalendarSync();
  else {
    const calendars = (await Calendar.getCalendars(Calendar.EntityTypes.EVENT)).filter((c) => c.allowsModifications);
    if (!calendars.length) throw new Error('Adaugă mai întâi un cont de calendar în setările telefonului sau alege Google / Outlook.');
    // The Android calendar editor lets the user choose the destination account.
    calendar = calendars.find((c) => c.isPrimary) || calendars[0];
  }
  const result = await calendar.addEventWithForm({ title: entry.title, notes: entry.description, location: entry.location, startDate: start, endDate: end });
  return result.action;
}
