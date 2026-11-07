import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { router } from 'expo-router';

export function PushObserver() {
  useEffect(() => {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    let active = true;
    let subscription: { remove: () => void } | undefined;
    void import('expo-notifications').then(Notifications => {
      if (!active) return;
      Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
      const open = (notification: import('expo-notifications').Notification) => {
        if (notification.request.content.data?.path !== '/people') return;
        router.navigate('/people');
        Notifications.clearLastNotificationResponse();
      };
      const response = Notifications.getLastNotificationResponse();
      if (response) open(response.notification);
      subscription = Notifications.addNotificationResponseReceivedListener(response => open(response.notification));
    }).catch(() => { /* Older installed binaries still keep in-app notifications. */ });
    return () => { active = false; subscription?.remove(); };
  }, []);
  return null;
}
