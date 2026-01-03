import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApiUrl } from './query-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') {
    return {
      granted: false,
      canAskAgain: false,
      status: 'denied',
    };
  }

  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain,
    status: status as 'granted' | 'denied' | 'undetermined',
  };
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') {
    return {
      granted: false,
      canAskAgain: false,
      status: 'denied',
    };
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return {
      granted: false,
      canAskAgain: false,
      status: 'denied',
    };
  }

  const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') {
    return {
      granted: true,
      canAskAgain: true,
      status: 'granted',
    };
  }

  if (!canAskAgain) {
    return {
      granted: false,
      canAskAgain: false,
      status: 'denied',
    };
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain: status !== 'denied',
    status: status as 'granted' | 'denied' | 'undetermined',
  };
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.log('No project ID found for push notifications');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

export async function registerPushToken(businessId: string): Promise<boolean> {
  try {
    const permissionStatus = await requestNotificationPermissions();
    
    if (!permissionStatus.granted) {
      console.log('Notification permission not granted');
      return false;
    }

    const token = await getExpoPushToken();
    
    if (!token) {
      console.log('Could not get push token');
      return false;
    }

    const platform = Platform.OS;
    const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;

    const response = await fetch(new URL('/api/push-tokens', getApiUrl()).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId,
        token,
        platform,
        deviceName,
      }),
    });

    if (!response.ok) {
      console.error('Failed to register push token');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
}

export async function unregisterPushToken(businessId: string, tokenToRemove?: string): Promise<boolean> {
  try {
    const token = tokenToRemove || await getExpoPushToken();
    
    if (!token) {
      return true;
    }

    const response = await fetch(new URL('/api/push-tokens', getApiUrl()).toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId,
        token,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return false;
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function setBadgeCount(count: number): Promise<boolean> {
  try {
    await Notifications.setBadgeCountAsync(count);
    return true;
  } catch (error) {
    console.error('Error setting badge count:', error);
    return false;
  }
}

export async function clearBadge(): Promise<boolean> {
  return setBadgeCount(0);
}
