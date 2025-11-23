import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://lekya-logistics.local/wp-json/lekya/v1';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = await AsyncStorage.getItem('authToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const response = await fetch(`${API_BASE}/jwt-auth/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  const result = await response.json();
  await AsyncStorage.setItem('authToken', result.token);
  await AsyncStorage.setItem('driverName', result.user_display_name);
  await AsyncStorage.setItem('driverId', String(result.user_id));
  await AsyncStorage.setItem('driverUsername', username);
}

export function fetchAssignedOrders() {
  return request<{ orders: DriverOrder[] }>('/orders/assigned');
}

export function updateOrderStatus(orderId: number, status: string, codAmount?: number, barcode?: string) {
  return request(`/orders/${orderId}/status`, {
    method: 'POST',
    body: {
      status,
      cod_amount: codAmount,
      barcode
    }
  });
}

export function submitBarcode(orderId: number, barcode: string, currentStatus: string) {
  return updateOrderStatus(orderId, currentStatus, undefined, barcode);
}

export type DriverOrder = {
  id: number;
  title: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  cod_amount: number;
  barcode?: string;
};
