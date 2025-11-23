import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { DriverOrder, fetchAssignedOrders } from '../services/api';
import { useLocationPublisher } from '../hooks/useLocationPublisher';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

export default function OrdersScreen({ navigation }: Props) {
  useLocationPublisher(true);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driverName, setDriverName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('driverName').then(value => {
      if (value) {
        setDriverName(value);
      }
    });
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchAssignedOrders();
      setOrders(data.orders || []);
    } catch (error) {
      console.warn('Failed to load orders', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchAssignedOrders();
      setOrders(data.orders || []);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOrderPress = (order: DriverOrder) => {
    navigation.navigate('OrderDetail', { orderId: order.id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <Text style={styles.headerSubtitle}>{driverName ? `Welcome, ${driverName}` : 'Ready for dispatch'}</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={item => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleOrderPress(item)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardStatus}>{item.status}</Text>
            <Text style={styles.cardText}>Pickup: {item.pickup_address}</Text>
            <Text style={styles.cardText}>Drop: {item.delivery_address}</Text>
            <Text style={styles.cardText}>COD: ₹{item.cod_amount.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No assigned orders.</Text>
          </View>
        }
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  header: {
    padding: 24
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  headerSubtitle: {
    color: '#94a3b8',
    marginTop: 4
  },
  card: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4
  },
  cardStatus: {
    color: '#38bdf8',
    marginBottom: 12
  },
  cardText: {
    color: '#cbd5f5',
    marginBottom: 4
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48
  },
  emptyText: {
    color: '#94a3b8'
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a'
  }
});
