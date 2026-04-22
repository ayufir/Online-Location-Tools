import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Platform, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const DEPARTMENTS = ['Installation', 'Maintenance', 'Survey', 'Sales', 'Inspection', 'Field Operations'];
const DESIGNATIONS = ['Solar Technician', 'Senior Technician', 'Field Engineer', 'Site Inspector', 'Field Sales Executive', 'Supervisor'];

export default function UnitListScreen() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: 'Installation',
    designation: 'Solar Technician'
  });

  useEffect(() => {
    fetchUnits();
    const interval = setInterval(fetchUnits, 20000); 
    return () => clearInterval(interval);
  }, []);

  const fetchUnits = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      setRefreshing(true);
      const res = await api.get('/location/live');
      if (res.data.success) {
        setUnits(res.data.data);
      }
    } catch (e: any) {
      console.error('[UnitList] Error:', e);
      if (e.response?.status === 401 || e.response?.status === 403) {
        router.replace('/login');
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleToggleRemote = async (id: string, currentlyEnabled: boolean) => {
    try {
      const newState = !currentlyEnabled;
      await api.put(`/employees/${id}/tracking`, { enable: newState });
      setUnits(prev => prev.map(u => u._id === id ? { ...u, isTrackingEnabled: newState } : u));
    } catch (e) {
      console.error('[RemoteToggle] Error:', e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    Alert.alert(
      'Terminate Operative',
      `Are you sure you want to remove ${name} from the fleet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Termination', 
          style: 'destructive',
          onPress: async () => {
             try {
               await api.delete(`/employees/${id}`);
               setUnits(prev => prev.filter(u => u._id !== id));
             } catch (e) {
               Alert.alert('Operation Failed', 'Could not remove member.');
             }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', phone: '', department: 'Installation', designation: 'Solar Technician' });
    setIsEditing(false);
    setEditId(null);
  };

  const handleAddPress = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEditPress = (unit: any) => {
    setForm({
      name: unit.name,
      email: unit.email,
      password: '', // Don't show password
      phone: unit.phone || '',
      department: unit.department || 'Installation',
      designation: unit.designation || 'Solar Technician'
    });
    setIsEditing(true);
    setEditId(unit._id);
    setModalVisible(true);
  };

  const saveEmployee = async () => {
    if (!form.name || !form.email || (!isEditing && !form.password)) {
      Alert.alert('Incomplete Data', 'Required fields are missing.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        const payload = { ...form };
        if (!payload.password) delete (payload as any).password;
        await api.put(`/employees/${editId}`, payload);
      } else {
        await api.post('/employees', form);
      }
      setModalVisible(false);
      fetchUnits();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const renderUnit = ({ item }: { item: any }) => (
    <View style={styles.unitCard}>
      <View style={styles.cardHeader}>
        <TouchableOpacity style={styles.avatarWrap} onPress={() => handleEditPress(item)}>
          <View style={[styles.statusRing, { borderColor: item.status === 'moving' ? '#10B981' : '#F59E0B' }]} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.unitName}>{item.name}</Text>
          <View style={styles.deptRow}>
             <Text style={styles.unitDept}>{item.department || 'Field Ops'}</Text>
             <View style={styles.dot} />
             <Text style={[styles.statusText, { color: item.status === 'moving' ? '#10B981' : '#F59E0B' }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.miniBtn, { backgroundColor: 'rgba(240, 246, 252, 0.05)' }]}
              onPress={() => handleEditPress(item)}
            >
               <Ionicons name="pencil" size={16} color="#F0F6FC" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.miniBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
              onPress={() => handleDelete(item._id, item.name)}
            >
               <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.commandBtn, { backgroundColor: item.isTrackingEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}
              onPress={() => handleToggleRemote(item._id, item.isTrackingEnabled)}
            >
               <Ionicons name="magnet-outline" size={20} color={item.isTrackingEnabled ? "#10B981" : "#EF4444"} />
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsGrid}>
         <View style={styles.statBox}>
            <Ionicons name="battery-charging" size={12} color="#8B949E" />
            <Text style={[styles.statVal, { color: item.batteryLevel < 25 ? '#EF4444' : '#F0F6FC' }]}>{item.batteryLevel || 100}%</Text>
            <Text style={styles.statLab}>POWER</Text>
         </View>
         <View style={styles.statBox}>
            <Ionicons name="speedometer-outline" size={12} color="#8B949E" />
            <Text style={styles.statVal}>
              {(item.currentLocation?.speed || item.location?.speed || 0) > 0.5 
                ? ((item.currentLocation?.speed || item.location?.speed || 0) * 3.6).toFixed(1) 
                : '0.0'} km/h
            </Text>
            <Text style={styles.statLab}>VELOCITY</Text>
         </View>
         <View style={styles.statBox}>
            <Ionicons name="time-outline" size={12} color="#8B949E" />
            <Text style={styles.statVal}>
              {item.currentLocation?.timestamp || item.location?.timestamp
                ? new Date(item.currentLocation?.timestamp || item.location?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'N/A'}
            </Text>
            <Text style={styles.statLab}>LAST PULSE</Text>
         </View>
      </View>

      {item.targetLocation?.label && (
        <View style={styles.missionBrief}>
           <View style={styles.missionLabel}>
              <Ionicons name="flag" size={10} color="#10B981" />
              <Text style={styles.missionTitle}>ACTIVE ASSIGNMENT</Text>
           </View>
           <Text style={styles.missionLoc}>{item.targetLocation.label}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerWrap}>
           <Text style={styles.title}>Personnel Hub</Text>
           <Text style={styles.subtitle}>{units.length} ACTIVE OPERATIVES</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddPress}>
           <Ionicons name="person-add" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={units}
        keyExtractor={(item) => item._id}
        renderItem={renderUnit}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchUnits} tintColor="#FFB800" />
        }
      />

      {/* Persistence Modal (Add/Edit) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>{isEditing ? 'UPDATE DOSSIER' : 'ENROLL NEW UNIT'}</Text>
                 <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#8B949E" />
                 </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                 <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>FULL NAME</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. John Doe" 
                      placeholderTextColor="#30363D"
                      value={form.name}
                      onChangeText={(t) => setForm({...form, name: t})}
                    />
                 </View>

                 <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>COMMS EMAIL</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="unit@vanguard.com" 
                      placeholderTextColor="#30363D"
                      value={form.email}
                      autoCapitalize="none"
                      onChangeText={(t) => setForm({...form, email: t})}
                    />
                 </View>

                 <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{isEditing ? 'NEW PASSWORD (OPTIONAL)' : 'INITIAL ACCESS KEY'}</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="Min 6 chars" 
                      placeholderTextColor="#30363D"
                      secureTextEntry
                      value={form.password}
                      onChangeText={(t) => setForm({...form, password: t})}
                    />
                 </View>

                 <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                       <Text style={styles.formLabel}>DEPARTMENT</Text>
                       <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                          {DEPARTMENTS.map(d => (
                            <TouchableOpacity 
                              key={d} 
                              style={[styles.chip, form.department === d && styles.chipActive]}
                              onPress={() => setForm({...form, department: d})}
                            >
                               <Text style={[styles.chipText, form.department === d && styles.chipTextActive]}>{d.toUpperCase()}</Text>
                            </TouchableOpacity>
                          ))}
                       </ScrollView>
                    </View>
                 </View>

                 <View style={[styles.formGroup, { marginTop: 10 }]}>
                    <Text style={styles.formLabel}>DESIGNATION</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                       {DESIGNATIONS.map(d => (
                         <TouchableOpacity 
                           key={d} 
                           style={[styles.chip, form.designation === d && styles.chipActive]}
                           onPress={() => setForm({...form, designation: d})}
                         >
                            <Text style={[styles.chipText, form.designation === d && styles.chipTextActive]}>{d.toUpperCase()}</Text>
                         </TouchableOpacity>
                       ))}
                    </ScrollView>
                 </View>

                 <TouchableOpacity 
                    style={[styles.saveBtn, loading && styles.btnDisabled]} 
                    onPress={saveEmployee}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{isEditing ? 'COMMIT UPDATES' : 'ACTIVATE UNIT'}</Text>}
                 </TouchableOpacity>
              </ScrollView>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010409',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 25,
    paddingBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(1, 4, 9, 0.98)',
  },
  headerWrap: {
    flex: 1,
  },
  title: {
    color: '#F0F6FC',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#FFB800',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  listContent: {
    padding: 15,
    paddingBottom: 150,
  },
  unitCard: {
    backgroundColor: '#0D1117',
    borderRadius: 32,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#010409',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarText: {
    color: '#F0F6FC',
    fontSize: 22,
    fontWeight: '900',
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#30363D',
    marginHorizontal: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  unitName: {
    color: '#F0F6FC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  unitDept: {
    color: '#8B949E',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  commandBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 18,
    borderRadius: 24,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  statLab: {
    color: '#30363D',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  missionBrief: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  missionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  missionTitle: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 1.5,
  },
  missionLoc: {
    color: '#F0F6FC',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 4, 9, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0D1117',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 30,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    color: '#F0F6FC',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    color: '#30363D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 18,
    color: '#F0F6FC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 246, 252, 0.05)',
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 246, 252, 0.03)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipActive: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  chipText: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#000',
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: '#FFB800',
    padding: 22,
    borderRadius: 22,
    alignItems: 'center',
    marginBottom: 40,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  btnDisabled: {
    opacity: 0.5,
  }
});
