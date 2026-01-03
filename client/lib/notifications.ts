import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApiUrl } from './query-client';

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

// Push notifications disabled to resolve EAS sync issues
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  return {
    granted: false,
    canAskAgain: false,
    status: 'denied',
  };
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  return {
    granted: false,
    canAskAgain: false,
    status: 'denied',
  };
}

export async function getExpoPushToken(): Promise<string | null> {
  return null;
}

export async function registerPushToken(businessId: string): Promise<boolean> {
  return false;
}

export async function unregisterPushToken(businessId: string, tokenToRemove?: string): Promise<boolean> {
  return true;
}

export function addNotificationReceivedListener(
  callback: (notification: any) => void
) {
  return { remove: () => {} };
}

export function addNotificationResponseReceivedListener(
  callback: (response: any) => void
) {
  return { remove: () => {} };
}

export async function setBadgeCount(count: number): Promise<boolean> {
  return true;
}

export async function clearBadge(): Promise<boolean> {
  return true;
}
