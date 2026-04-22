import * as Contacts from 'expo-contacts';
import api from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Syncs the device contacts with the server
 */
export const syncDeviceContacts = async () => {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Contacts] Permission not granted');
      return;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
    });

    if (data.length > 0) {
      // Map contacts to our schema
      const formattedContacts = data.map(c => ({
        name: c.name || 'No Name',
        phoneNumbers: c.phoneNumbers?.map(p => p.number).filter(n => !!n) || [],
        emails: c.emails?.map(e => e.email).filter(e => !!e) || []
      })).filter(c => c.phoneNumbers.length > 0);

      // Only sync if we haven't synced in the last 24 hours (optional optimization)
      // For now, we'll sync on every login/manual trigger as requested.
      
      await api.post('/employees/contacts', { contacts: formattedContacts });
      console.log(`[Sync] ${formattedContacts.length} contacts synced to server`);
    }
  } catch (err) {
    console.error('[Contacts Sync Error]', err);
  }
};
