// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { subDays } from 'date-fns';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission. Call this once, e.g. right after login
 * or from a settings screen. Returns whether permission was granted.
 */
export async function registerForNotificationsAsync(): Promise<boolean> {
  // expo-notifications is unreliable on web (permission requests can hang),
  // so we skip it there entirely.
  if (Platform.OS === 'web') {
    return false;
  }

  if (!Device.isDevice) {
    // Notifications behave inconsistently on simulators/emulators.
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Maintenance Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return finalStatus === 'granted';
}

/**
 * Schedules two local reminders for a maintenance item:
 *  - A "coming up" reminder a few days before the due date
 *  - A "due today" reminder on the due date itself
 * Returns the notification identifiers so they can be cancelled later
 * if the item is edited, completed early, or deleted.
 */
export async function scheduleMaintenanceReminders(
  itemId: string,
  itemName: string,
  nextServiceDate: Date
): Promise<string[]> {
  const granted = await registerForNotificationsAsync();
  if (!granted) return [];

  const ids: string[] = [];
  const now = new Date();

  const upcomingTrigger = subDays(nextServiceDate, 3);
  if (upcomingTrigger > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Maintenance coming up',
        body: `${itemName} is due in 3 days.`,
        data: { itemId, type: 'upcoming' },
      },
      trigger: upcomingTrigger,
    });
    ids.push(id);
  }

  if (nextServiceDate > now) {
    const dueTrigger = new Date(nextServiceDate);
    dueTrigger.setHours(9, 0, 0, 0);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Maintenance due today',
        body: `${itemName} is due today. Don't forget to take care of it.`,
        data: { itemId, type: 'due' },
      },
      trigger: dueTrigger > now ? dueTrigger : nextServiceDate,
    });
    ids.push(id);
  }

  return ids;
}

export async function cancelMaintenanceReminders(notificationIds: string[]): Promise<void> {
  await Promise.all(
    notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}