import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = (() => {
  try {
    return JSON.parse(process.env.EXPO_PUBLIC_FIREBASE_CONFIG ?? '{}');
  } catch (error) {
    console.warn('Invalid Firebase config', error);
    return {};
  }
})();
let appInstance: ReturnType<typeof initializeApp> | undefined;

function getFirebaseApp() {
  if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
    return null;
  }
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function useLocationPublisher(active: boolean) {
  const watchId = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!active) {
      stopWatcher();
      return;
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !isMounted) {
        return;
      }
      watchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 20
        },
        async coords => {
          const driverId = await AsyncStorage.getItem('driverId');
          if (!driverId) {
            return;
          }
          const app = getFirebaseApp();
          if (!app) {
            return;
          }
          const db = getDatabase(app);
          await set(ref(db, `drivers/${driverId}`), {
            lat: coords.coords.latitude,
            lng: coords.coords.longitude,
            speed: coords.coords.speed,
            heading: coords.coords.heading,
            timestamp: coords.timestamp
          });
        }
      );
    })();

    return () => {
      isMounted = false;
      stopWatcher();
    };
  }, [active]);

  const stopWatcher = () => {
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
    }
  };
}
