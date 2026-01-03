// Push notifications disabled
export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

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
  return true;
}

export async function unregisterPushToken(businessId: string, tokenToRemove?: string): Promise<boolean> {
  return true;
}

export function addNotificationReceivedListener(callback: any) {
  return { remove: () => {} };
}

export function addNotificationResponseReceivedListener(callback: any) {
  return { remove: () => {} };
}

export async function setBadgeCount(count: number): Promise<boolean> {
  return true;
}

export async function clearBadge(): Promise<boolean> {
  return true;
}
