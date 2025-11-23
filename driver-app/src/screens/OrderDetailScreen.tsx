import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BarCodeScanner, PermissionStatus } from 'expo-barcode-scanner';
import { RootStackParamList } from '../App';
import { DriverOrder, fetchAssignedOrders, submitBarcode, updateOrderStatus } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const ORDER_STATUSES = ['accepted', 'picked_up', 'in_transit', 'delivered', 'returned'] as const;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<PermissionStatus | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await fetchAssignedOrders();
      const found = (data.orders || []).find(item => item.id === orderId) || null;
      setOrder(found);
    } catch (error) {
      console.warn('Failed to fetch order detail', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!order) {
      return;
    }
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, status);
      await loadOrder();
      Alert.alert('Success', `Order status updated to ${status}`);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Update failed', error.message);
      }
    } finally {
      setUpdating(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasCameraPermission(status);
    if (status === PermissionStatus.GRANTED) {
      setScannerVisible(true);
    } else {
      Alert.alert('Permission denied', 'Camera access is required to scan barcodes');
    }
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    setScannerVisible(false);
    if (data && order) {
      try {
        await submitBarcode(order.id, data, order.status);
        await loadOrder();
        Alert.alert('Barcode captured', data);
      } catch (error) {
        if (error instanceof Error) {
          Alert.alert('Barcode failed', error.message);
        }
      }
    }
  };

  const statusButtons = useMemo(
    () =>
      ORDER_STATUSES.map(status => (
        <TouchableOpacity
          key={status}
          style={[styles.statusButton, order?.status === status ? styles.statusButtonActive : null]}
          onPress={() => handleStatusUpdate(status)}
          disabled={updating}
        >
          <Text style={styles.statusButtonText}>{status.replace('_', ' ')}</Text>
        </TouchableOpacity>
      )),
    [order, updating]
  );

  if (loading || !order) {
    return (
      <View style={styles.loadingContainer}>
        {loading ? <ActivityIndicator size="large" color="#0ea5e9" /> : <Text style={styles.emptyState}>Order not found</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{order.title}</Text>
      <Text style={styles.subtitle}>Status: {order.status}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route</Text>
        <Text style={styles.sectionText}>Pickup: {order.pickup_address}</Text>
        <Text style={styles.sectionText}>Delivery: {order.delivery_address}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cash on Delivery</Text>
        <Text style={styles.sectionText}>Amount: ₹{order.cod_amount.toFixed(2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Barcode</Text>
        <Text style={styles.sectionText}>{order.barcode || 'Tap scan to capture'}</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            if (hasCameraPermission === PermissionStatus.GRANTED) {
              setScannerVisible(true);
            } else {
              requestCameraPermission();
            }
          }}
        >
          <Text style={styles.scanButtonText}>Scan Package</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workflow</Text>
        <View style={styles.statusRow}>{statusButtons}</View>
      </View>

      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={handleBarcodeScan}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity style={styles.closeScanner} onPress={() => setScannerVisible(false)}>
            <Text style={styles.closeScannerText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollContent: {
    paddingBottom: 24
  },
  backButton: {
    padding: 16
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 16
  },
  title: {
    fontSize: 24,
    color: '#f8fafc',
    fontWeight: 'bold',
    paddingHorizontal: 16
  },
  subtitle: {
    color: '#38bdf8',
    marginTop: 4,
    paddingHorizontal: 16,
    marginBottom: 12
  },
  section: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontWeight: '600',
    marginBottom: 8
  },
  sectionText: {
    color: '#cbd5f5',
    marginBottom: 8
  },
  scanButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  statusButton: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  statusButtonActive: {
    backgroundColor: '#0ea5e9'
  },
  statusButtonText: {
    color: '#f1f5f9',
    textTransform: 'capitalize'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a'
  },
  emptyState: {
    color: '#cbd5f5'
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  closeScanner: {
    position: 'absolute',
    bottom: 60,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24
  },
  closeScannerText: {
    color: '#fff',
    fontSize: 16
  }
});
