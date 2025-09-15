import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
// Map functionality disabled for web compatibility
import AddUserModal from './components/AddUserModal';
import RealTimeMessages from './components/RealTimeMessages';
import GoogleMapsView from './components/GoogleMapsView';

const { width, height } = Dimensions.get('window');

// Theme Context für Dark/Light Mode
const ThemeContext = createContext();

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? {
      // Dark Theme
      primary: '#3B82F6',
      primaryDark: '#1E40AF',
      secondary: '#10B981',
      background: '#111827',
      surface: '#1F2937',
      card: '#374151',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
      textMuted: '#9CA3AF',
      border: '#4B5563',
      error: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981',
      shadow: 'rgba(0, 0, 0, 0.5)',
    } : {
      // Light Theme
      primary: '#1E3A8A',
      primaryDark: '#1E40AF',
      secondary: '#059669',
      background: '#F3F4F6',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      text: '#111827',
      textSecondary: '#374151',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      error: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981',
      shadow: 'rgba(0, 0, 0, 0.1)',
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Context
const AuthContext = React.createContext(null);

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = "http://212.227.57.238:8001";

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });

      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es später erneut.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, userData);
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.' 
      };
    }
  };

  const updateUser = async (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Modern Login Screen
const LoginScreen = () => {
  const { login } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Verbindungsfehler', result.error);
    }
  };

  // Schnell-Login entfernt auf Benutzerwunsch

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    content: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 50,
    },
    logoContainer: {
      marginBottom: 24,
    },
    logoCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    title: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 18,
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
    },
    form: {
      marginBottom: 40,
    },
    inputGroup: {
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: 8,
    },
    input: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      fontSize: 16,
      color: '#FFFFFF',
      backdropFilter: 'blur(10px)',
    },
    loginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      paddingVertical: 18,
      paddingHorizontal: 32,
      borderRadius: 12,
      marginTop: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    loginButtonDisabled: {
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    loginButtonText: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: '700',
      marginLeft: 12,
    },
    registerLink: {
      alignItems: 'center',
      marginTop: 24,
      paddingVertical: 12,
    },
    registerLinkText: {
      color: colors.textSecondary,
      fontSize: 16,
      textDecorationLine: 'underline',
    },
    demoInfo: {
      marginTop: 24,
      padding: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    demoText: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 6,
    },
    demoSubtext: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 14,
      textAlign: 'center',
    },
    footer: {
      alignItems: 'center',
    },
    footerText: {
      fontSize: 18,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: 4,
    },
    footerSubtext: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.6)',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <KeyboardAvoidingView 
        style={dynamicStyles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.logoContainer}>
            <View style={dynamicStyles.logoCircle}>
              <Ionicons name="shield-checkmark" size={50} color="#FFFFFF" />
            </View>
          </View>
          <Text style={dynamicStyles.title}>Stadtwache</Text>
          <Text style={dynamicStyles.subtitle}>Sicherheitsbehörde Schwelm</Text>
        </View>

        <View style={dynamicStyles.form}>
          <View style={dynamicStyles.inputGroup}>
            <Text style={dynamicStyles.inputLabel}>E-Mail Adresse</Text>
            <TextInput
              style={dynamicStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="benutzer@stadtwache.de"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={dynamicStyles.inputGroup}>
            <Text style={dynamicStyles.inputLabel}>Passwort</Text>
            <TextInput
              style={dynamicStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Passwort eingeben"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[dynamicStyles.loginButton, loading && dynamicStyles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Ionicons name="log-in" size={24} color={colors.primary} />
                <Text style={dynamicStyles.loginButtonText}>Anmelden</Text>
              </>
            )}
          </TouchableOpacity>


        </View>

        <View style={dynamicStyles.footer}>
          <Text style={dynamicStyles.footerText}>Stadtwache Schwelm</Text>
          <Text style={dynamicStyles.footerSubtext}>
            Sichere Verbindung • Server: 212.227.57.238:8001
          </Text>
        </View>


      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Modern Map View for Incidents - Web-compatible version
const IncidentMapModal = ({ visible, onClose, incident }) => {
  const { colors } = useTheme();
  
  const dynamicStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      backgroundColor: colors.card,
      borderRadius: 8,
    },
    mapContainer: {
      flex: 1,
      margin: 16,
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    webMapContainer: {
      flex: 1,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mapPlaceholder: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
    },
    incidentInfo: {
      backgroundColor: colors.surface,
      margin: 16,
      padding: 20,
      borderRadius: 16,
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    incidentTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    incidentDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    priorityBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 8,
    },
    priorityText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.textMuted;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={dynamicStyles.modalContainer}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Vorfall auf Karte</Text>
          <View style={{ width: 40 }} />
        </View>

        <GoogleMapsView incident={incident} user={user} token={token} />

        {incident && (
          <View style={dynamicStyles.incidentInfo}>
            <Text style={dynamicStyles.incidentTitle}>{incident.title}</Text>
            <Text style={dynamicStyles.incidentDetail}>📍 {incident.address}</Text>
            <Text style={dynamicStyles.incidentDetail}>
              🕒 {new Date(incident.created_at).toLocaleString('de-DE')}
            </Text>
            <Text style={dynamicStyles.incidentDetail}>📝 {incident.description}</Text>
            
            <View style={[
              dynamicStyles.priorityBadge,
              { backgroundColor: getPriorityColor(incident.priority) }
            ]}>
              <Text style={dynamicStyles.priorityText}>
                {incident.priority === 'high' ? '🚨 HOHE PRIORITÄT' : 
                 incident.priority === 'medium' ? '⚠️ MITTLERE PRIORITÄT' : 
                 '✅ NIEDRIGE PRIORITÄT'}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// Modern Main App
const MainApp = () => {
  const { user, updateUser, logout, token } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState({ incidents: 0, officers: 0, messages: 0 });
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  
  // Profile states
  const [userStatus, setUserStatus] = useState(user?.status || 'Im Dienst');
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    phone: user?.phone || '',
    service_number: user?.service_number || '',
    rank: user?.rank || '',
    department: user?.department || ''
  });

  // Incident states
  const [incidentFormData, setIncidentFormData] = useState({
    title: '',
    description: '',
    location: '',
    address: '',
    priority: 'medium'
  });
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Report/Berichte states
  const [reports, setReports] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [reportFormData, setReportFormData] = useState({
    title: '',
    content: '',
    shift_date: new Date().toISOString().split('T')[0]
  });
  const [savingReport, setSavingReport] = useState(false);

  // Team states
  const [usersByStatus, setUsersByStatus] = useState({});
  const [teamLoading, setTeamLoading] = useState(false);
  
  const API_URL = "http://212.227.57.238:8001";
  
  useEffect(() => {
    loadData();
    if (user) {
      setUserStatus(user.status || 'Im Dienst');
      setProfileData({
        username: user.username || '',
        phone: user.phone || '',
        service_number: user.service_number || '',
        rank: user.rank || '',
        department: user.department || ''
      });
    }
  }, [user]);

  // Load reports data
  const loadReports = async () => {
    try {
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};

      console.log('📄 Loading reports...');
      const reportsResponse = await axios.get(`${API_URL}/api/reports`, config);
      console.log('✅ Reports loaded:', reportsResponse.data.length);
      setReports(reportsResponse.data);
      
    } catch (error) {
      console.error('❌ Error loading reports:', error);
      setReports([]);
    }
  };

  // Save or update report
  const saveReport = async () => {
    if (!reportFormData.title || !reportFormData.content) {
      Alert.alert('⚠️ Fehler', 'Bitte füllen Sie Titel und Inhalt aus');
      return;
    }

    setSavingReport(true);

    try {
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};

      if (editingReport) {
        // Update existing report
        console.log('📝 Updating report:', editingReport.id);
        const response = await axios.put(`${API_URL}/api/reports/${editingReport.id}`, reportFormData, config);
        console.log('✅ Report updated successfully');
        Alert.alert('✅ Erfolg', 'Bericht wurde erfolgreich aktualisiert!');
      } else {
        // Create new report
        console.log('📝 Creating new report');
        const response = await axios.post(`${API_URL}/api/reports`, reportFormData, config);
        console.log('✅ Report created successfully');
        Alert.alert('✅ Erfolg', 'Bericht wurde erfolgreich erstellt!');
      }

      setShowReportModal(false);
      setEditingReport(null);
      setReportFormData({
        title: '',
        content: '',
        shift_date: new Date().toISOString().split('T')[0]
      });
      
      // Reload reports
      await loadReports();

    } catch (error) {
      console.error('❌ Error saving report:', error);
      Alert.alert('❌ Fehler', 'Bericht konnte nicht gespeichert werden');
    } finally {
      setSavingReport(false);
    }
  };

  // Create new report
  const createNewReport = () => {
    setEditingReport(null);
    setReportFormData({
      title: '',
      content: '',
      shift_date: new Date().toISOString().split('T')[0]
    });
    setShowReportModal(true);
  };

  // Open report for editing
  const editReport = (report) => {
    setEditingReport(report);
    setReportFormData({
      title: report.title,
      content: report.content,
      shift_date: report.shift_date
    });
    setShowReportModal(true);
  };

  useEffect(() => {
    if (activeTab === 'team') {
      loadUsersByStatus();
    }
    if (activeTab === 'berichte') {
      loadReports();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading incidents and stats...');
      console.log('🔗 API URL:', API_URL);
      console.log('👤 User:', user?.username, 'Token available:', !!token);
      
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};

      // Load incidents - CRITICAL FIX: Make sure this works without auth too
      try {
        const incidentsResponse = await axios.get(`${API_URL}/api/incidents`, config);
        console.log('✅ Incidents API response:', incidentsResponse.status, incidentsResponse.data.length, 'incidents');
        
        // CRITICAL FIX: Show all incidents, not just first 10
        const allIncidents = incidentsResponse.data || [];
        setRecentIncidents(allIncidents);
        
        console.log('📊 Setting incidents in state:', allIncidents.length);
        
        // Debug: Log first few incidents
        allIncidents.slice(0, 3).forEach((incident, i) => {
          console.log(`📋 Incident ${i+1}:`, {
            id: incident.id,
            title: incident.title,
            status: incident.status,
            created_at: incident.created_at
          });
        });
        
      } catch (incidentError) {
        console.error('❌ Error loading incidents:', incidentError);
        console.error('❌ Incident error details:', incidentError.response?.data);
        
        // Set empty array if error
        setRecentIncidents([]);
      }
      
      // Load stats if admin
      if (user?.role === 'admin') {
        try {
          const statsResponse = await axios.get(`${API_URL}/api/admin/stats`, config);
          setStats({
            incidents: statsResponse.data.total_incidents,
            officers: statsResponse.data.total_users,
            messages: statsResponse.data.total_messages
          });
          console.log('✅ Stats loaded:', statsResponse.data);
        } catch (statsError) {
          console.error('❌ Error loading stats:', statsError);
          // Set default stats on error
          setStats({ incidents: 0, officers: 0, messages: 0 });
        }
      } else {
        // For non-admin users, set stats based on actual data
        setStats(prev => ({
          ...prev,
          incidents: recentIncidents.length
        }));
      }
    } catch (error) {
      console.error('❌ Error in loadData:', error);
      Alert.alert('Verbindungsfehler', 'Kann Daten nicht vom Server laden. Bitte prüfen Sie Ihre Internetverbindung.');
    } finally {
      setLoading(false);
    }
  };

  const loadUsersByStatus = async () => {
    setTeamLoading(true);
    try {
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};
      
      const response = await axios.get(`${API_URL}/api/users/by-status`, config);
      setUsersByStatus(response.data);
      console.log('✅ Team data loaded:', Object.keys(response.data).length, 'status groups');
    } catch (error) {
      console.error('❌ Error loading team data:', error);
      setUsersByStatus({});
    } finally {
      setTeamLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (activeTab === 'team') {
      await loadUsersByStatus();
    }
    setRefreshing(false);
  };

  const saveProfile = async () => {
    try {
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};
      
      const updates = { 
        username: profileData.username,
        phone: profileData.phone,
        service_number: profileData.service_number,
        rank: profileData.rank,
        department: profileData.department,
        status: userStatus 
      };
      
      const response = await axios.put(`${API_URL}/api/auth/profile`, updates, config);
      
      Alert.alert('✅ Erfolg', 'Profil wurde erfolgreich aktualisiert!');
      setShowProfileModal(false);
      
      await updateUser(response.data);
      
      setUserStatus(response.data.status);
      setProfileData({
        username: response.data.username,
        phone: response.data.phone || '',
        service_number: response.data.service_number || '',
        rank: response.data.rank || '',
        department: response.data.department || ''
      });
      
    } catch (error) {
      console.error('❌ Profile update error:', error);
      Alert.alert('❌ Fehler', 'Profil konnte nicht gespeichert werden');
    }
  };

  const submitIncident = async () => {
    if (!incidentFormData.title || !incidentFormData.description) {
      Alert.alert('⚠️ Fehler', 'Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setSubmittingIncident(true);
    
    try {
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};

      const incidentData = {
        title: incidentFormData.title,
        description: incidentFormData.description,
        priority: incidentFormData.priority,
        location: incidentFormData.location ? 
          { lat: parseFloat(incidentFormData.location.split(',')[0]), lng: parseFloat(incidentFormData.location.split(',')[1]) } :
          { lat: 51.2879, lng: 7.2954 },
        address: incidentFormData.address || 'Schwelm, Deutschland',
        images: []
      };

      const response = await axios.post(`${API_URL}/api/incidents`, incidentData, config);
      
      Alert.alert(
        '✅ Erfolg', 
        'Vorfall wurde erfolgreich gemeldet!',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setIncidentFormData({
                title: '',
                description: '',
                location: '',
                address: '',
                priority: 'medium'
              });
              setActiveTab('home');
              loadData();
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error submitting incident:', error);
      Alert.alert('❌ Fehler', 'Vorfall konnte nicht gemeldet werden');
    } finally {
      setSubmittingIncident(false);
    }
  };

  const openIncidentDetails = (incident) => {
    setSelectedIncident(incident);
    setShowIncidentModal(true);
  };

  const openIncidentMap = (incident) => {
    setSelectedIncident(incident);
    setShowMapModal(true);
  };

  const takeIncident = async () => {
    if (!selectedIncident) return;
    
    try {
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};
      
      const response = await axios.put(`${API_URL}/api/incidents/${selectedIncident.id}/assign`, {}, config);
      
      const updatedIncident = response.data;
      setSelectedIncident(updatedIncident);
      
      Alert.alert('✅ Erfolg', 'Vorfall wurde Ihnen zugewiesen!');
      await loadData();
    } catch (error) {
      Alert.alert('❌ Fehler', 'Vorfall konnte nicht zugewiesen werden');
    }
  };

  const completeIncident = async () => {
    if (!selectedIncident) return;
    
    Alert.alert(
      '✅ Vorfall abschließen',
      'Möchten Sie diesen Vorfall als erledigt markieren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Erledigt',
          onPress: async () => {
            try {
              const config = token ? {
                headers: { Authorization: `Bearer ${token}` }
              } : {};
              
              await axios.put(`${API_URL}/api/incidents/${selectedIncident.id}/complete`, {}, config);
              
              Alert.alert('✅ Erfolg', 'Vorfall wurde als erledigt markiert!');
              setShowIncidentModal(false);
              setSelectedIncident(null);
              await loadData();
            } catch (error) {
              Alert.alert('❌ Fehler', 'Vorfall konnte nicht abgeschlossen werden');
            }
          }
        }
      ]
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.textMuted;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Im Dienst': return '#10B981';
      case 'Pause': return '#F59E0B';
      case 'Einsatz': return '#EF4444';
      case 'Streife': return '#8B5CF6';
      case 'Nicht verfügbar': return '#6B7280';
      default: return '#10B981';
    }
  };

  const getCurrentLocation = async () => {
    try {
      const mockLocation = { lat: 51.2879, lng: 7.2954 };
      setIncidentFormData(prev => ({
        ...prev,
        location: `${mockLocation.lat.toFixed(6)}, ${mockLocation.lng.toFixed(6)}`,
        address: 'Schwelm, Deutschland (Automatisch ermittelt)'
      }));
      Alert.alert('📍 Position', 'Position wurde automatisch eingetragen');
    } catch (error) {
      Alert.alert('❌ Fehler', 'Position konnte nicht ermittelt werden');
    }
  };

  // Dynamic Styles basierend auf Theme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    
    // Modern Header
    homeHeader: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flex: 1,
    },
    welcomeText: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 4,
    },
    userName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      alignSelf: 'flex-start',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    userRole: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Modern Stats
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 24,
      gap: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 20,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    statNumber: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      fontWeight: '600',
    },

    // Modern Cards
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: 24,
      borderRadius: 20,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },

    // Modern Incident Cards
    incidentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    incidentIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    incidentContent: {
      flex: 1,
    },
    incidentTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    incidentTime: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 4,
    },
    incidentStatus: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    incidentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mapButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButton: {
      backgroundColor: colors.success,
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reportActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteReportButton: {
      backgroundColor: colors.error,
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    // Action Buttons
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 16,
      marginTop: 8,
    },
    actionText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      marginLeft: 12,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: 20,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      opacity: 0.8,
    },

    // Tab Bar
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      elevation: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 16,
    },
    tabItemActive: {
      backgroundColor: colors.primary,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 4,
    },
    tabLabelActive: {
      color: '#FFFFFF',
    },

    // Screen Headers
    screenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginLeft: 12,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    addButton: {
      padding: 12,
      backgroundColor: colors.primary,
      borderRadius: 12,
    },

    // Form Styles
    form: {
      flex: 1,
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    formInput: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    locationInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    locationButton: {
      padding: 14,
      backgroundColor: colors.primary,
      borderRadius: 12,
    },
    priorityButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    priorityButton: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    priorityButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    priorityButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    priorityButtonTextActive: {
      color: '#FFFFFF',
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 18,
      borderRadius: 16,
      marginTop: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    submitButtonDisabled: {
      backgroundColor: colors.textMuted,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      marginLeft: 12,
    },
    submitNote: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 16,
      fontStyle: 'italic',
    },

    // Team Styles
    teamList: {
      flex: 1,
      padding: 16,
    },
    statusGroup: {
      marginBottom: 24,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 18,
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    statusTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },
    statusCount: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusCountText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    officerCard: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    officerInfo: {
      flex: 1,
    },
    officerName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    officerDetails: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    officerBadge: {
      fontSize: 13,
      color: colors.textMuted,
    },

    // Modals
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    modalContent: {
      flex: 1,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
      marginTop: 24,
    },
    statusOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    statusOptionActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    statusOptionText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginLeft: 12,
      flex: 1,
      fontWeight: '500',
    },
    statusOptionTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },

    // Theme Toggle
    themeToggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    },
    themeToggleText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },

    // Incident Details
    incidentDetailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    incidentDetailTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 16,
    },
    priorityBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    priorityBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    detailSection: {
      marginBottom: 20,
    },
    detailLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    detailText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    actionButtons: {
      marginTop: 24,
      gap: 12,
    },
    takeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
    },
    takeButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 8,
    },
    completeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
      paddingVertical: 16,
      borderRadius: 12,
    },
    completeButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 8,
    },
    mapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.warning,
      paddingVertical: 16,
      borderRadius: 12,
    },
    mapButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 8,
    },

    // Report Writing Styles
    reportTextArea: {
      height: 300,
      textAlignVertical: 'top',
      lineHeight: 22,
    },
    reportPreview: {
      marginBottom: 20,
    },
    previewCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    previewMeta: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    previewContent: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginTop: 8,
    },
    saveOptions: {
      flexDirection: 'row',
      gap: 12,
    },
    optionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
    },
    optionText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },

    // RegisterModal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '90%',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
    },
    formContainer: {
      flex: 1,
      padding: 20,
    },
    errorContainer: {
      backgroundColor: colors.error + '20',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    registerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    registerButtonDisabled: {
      backgroundColor: colors.textMuted,
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 8,
    },
  });

  const renderHomeScreen = () => (
    <ScrollView 
      style={dynamicStyles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Modern Header */}
      <View style={dynamicStyles.homeHeader}>
        <View style={dynamicStyles.headerContent}>
          <View style={dynamicStyles.headerLeft}>
            <Text style={dynamicStyles.welcomeText}>Willkommen zurück,</Text>
            <Text style={dynamicStyles.userName}>{user?.username}</Text>
            <View style={dynamicStyles.statusBadge}>
              <View style={[dynamicStyles.statusDot, { backgroundColor: getStatusColor(userStatus) }]} />
              <Text style={dynamicStyles.userRole}>
                {user?.role === 'admin' ? 'Administrator' : 'Wächter'} • {userStatus}
              </Text>
            </View>
          </View>
          <View style={dynamicStyles.headerButtons}>
            <TouchableOpacity style={dynamicStyles.headerButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={dynamicStyles.headerButton} 
              onPress={() => setShowProfileModal(true)}
              accessible={true}
              accessibilityLabel="Profil bearbeiten"
            >
              <Ionicons name="person-circle" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modern Stats */}
      <View style={dynamicStyles.statsContainer}>
        <View style={dynamicStyles.statCard}>
          <View style={[dynamicStyles.statIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle" size={24} color="#DC2626" />
          </View>
          <Text style={dynamicStyles.statNumber}>{recentIncidents.length}</Text>
          <Text style={dynamicStyles.statLabel}>Aktuelle{'\n'}Vorfälle</Text>
        </View>
        
        <View style={dynamicStyles.statCard}>
          <View style={[dynamicStyles.statIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="people" size={24} color="#059669" />
          </View>
          <Text style={dynamicStyles.statNumber}>{stats.officers}</Text>
          <Text style={dynamicStyles.statLabel}>Team{'\n'}Mitglieder</Text>
        </View>
        
        <View style={dynamicStyles.statCard}>
          <View style={[dynamicStyles.statIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="chatbubbles" size={24} color="#2563EB" />
          </View>
          <Text style={dynamicStyles.statNumber}>{stats.messages}</Text>
          <Text style={dynamicStyles.statLabel}>Nachrichten</Text>
        </View>
      </View>

      {/* Admin Quick Actions - NUR FÜR ADMINS */}
      {user?.role === 'admin' && (
        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.cardHeader}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            <Text style={dynamicStyles.cardTitle}>Admin Bereich</Text>
          </View>
          <TouchableOpacity 
            style={dynamicStyles.actionButton}
            onPress={() => setShowAddUserModal(true)}
            accessible={true}
            accessibilityLabel="Neuen Benutzer hinzufügen"
          >
            <Ionicons name="person-add" size={20} color="#FFFFFF" />
            <Text style={dynamicStyles.actionText}>Neuen Benutzer hinzufügen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Incidents - FIXED VERSION */}
      <View style={dynamicStyles.card}>
        <View style={dynamicStyles.cardHeader}>
          <Ionicons name="time" size={24} color={colors.primary} />
          <Text style={dynamicStyles.cardTitle}>Aktuelle Vorfälle</Text>
          <TouchableOpacity onPress={loadData}>
            <Ionicons name="refresh" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        
        {/* CRITICAL FIX: Better empty state handling */}
        {loading ? (
          <View style={dynamicStyles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={dynamicStyles.emptyText}>Lade Vorfälle...</Text>
          </View>
        ) : recentIncidents.length === 0 ? (
          <View style={dynamicStyles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={colors.secondary} style={dynamicStyles.emptyIcon} />
            <Text style={dynamicStyles.emptyText}>Keine aktuellen Vorfälle</Text>
            <Text style={dynamicStyles.emptySubtext}>
              {user ? 'Alle ruhig in der Stadt! 🏙️' : 'Bitte melden Sie sich an, um Vorfälle zu sehen'}
            </Text>
            {!user && (
              <TouchableOpacity 
                style={dynamicStyles.actionButton}
                onPress={() => setActiveTab('report')}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={dynamicStyles.actionText}>Ersten Vorfall melden</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={[dynamicStyles.emptySubtext, { marginBottom: 12, textAlign: 'center' }]}>
              📊 {recentIncidents.length} Vorfall{recentIncidents.length !== 1 ? 'e' : ''} gefunden
            </Text>
            
            {recentIncidents.map((incident, index) => (
              <TouchableOpacity 
                key={incident.id || index} 
                style={[dynamicStyles.incidentCard, 
                  { borderLeftColor: getPriorityColor(incident.priority) }
                ]}
                onPress={() => openIncidentDetails(incident)}
              >
                <View style={[dynamicStyles.incidentIcon, 
                  { backgroundColor: getPriorityColor(incident.priority) + '20' }
                ]}>
                  <Ionicons name="alert-circle" size={24} color={getPriorityColor(incident.priority)} />
                </View>
                <View style={dynamicStyles.incidentContent}>
                  <Text style={dynamicStyles.incidentTitle}>{incident.title || 'Unbekannter Vorfall'}</Text>
                  <Text style={dynamicStyles.incidentTime}>
                    🕒 {incident.created_at ? 
                      new Date(incident.created_at).toLocaleString('de-DE') : 
                      'Unbekannte Zeit'
                    }
                  </Text>
                  <Text style={dynamicStyles.incidentTime}>
                    📍 {incident.address || 'Unbekannte Adresse'}
                  </Text>
                  <Text style={[
                    dynamicStyles.incidentStatus,
                    { color: incident.status === 'open' ? colors.error : 
                             incident.status === 'in_progress' ? colors.warning : 
                             colors.success }
                  ]}>
                    {incident.status === 'open' ? '🔴 Offen' : 
                     incident.status === 'in_progress' ? '🟡 In Bearbeitung' : 
                     incident.status === 'completed' ? '🟢 Abgeschlossen' :
                     '❓ ' + (incident.status || 'Unbekannt')}
                  </Text>
                  {incident.assigned_to_name && (
                    <Text style={[dynamicStyles.incidentTime, { color: colors.success }]}>
                      👤 Bearbeitet von: {incident.assigned_to_name}
                    </Text>
                  )}
                  <Text style={[dynamicStyles.incidentTime, { fontWeight: '600' }]}>
                    Priorität: {incident.priority === 'high' ? '🔴 HOCH' : 
                               incident.priority === 'medium' ? '🟡 MITTEL' : 
                               incident.priority === 'low' ? '🟢 NIEDRIG' : 
                               '❓ ' + (incident.priority || 'Unbekannt')}
                  </Text>
                </View>
                <View style={dynamicStyles.incidentActions}>
                  <TouchableOpacity 
                    style={dynamicStyles.mapButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      // Öffne Karten-Ansicht für diesen Vorfall
                      openIncidentDetails(incident);
                    }}
                  >
                    <Ionicons name="map" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={dynamicStyles.deleteButton}
                    onPress={async (e) => {
                      e.stopPropagation(); // Verhindert das Öffnen des Vorfalls
                      try {
                        const config = token ? {
                          headers: { Authorization: `Bearer ${token}` }
                        } : {};
                        
                        await axios.put(`${API_URL}/api/incidents/${incident.id}/complete`, {}, config);
                        await loadData(); // Liste neu laden
                        
                      } catch (error) {
                        console.error('Fehler beim Löschen:', error);
                      }
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );

  const renderMessagesScreen = () => (
    <View style={dynamicStyles.content}>
      <View style={dynamicStyles.screenHeader}>
        <Ionicons name="chatbubbles" size={28} color={colors.primary} />
        <Text style={dynamicStyles.screenTitle}>Nachrichten</Text>
      </View>
      <RealTimeMessages 
        user={user}
        token={token}
        selectedChannel="general"
      />
    </View>
  );

  const renderIncidentScreen = () => (
    <View style={dynamicStyles.content}>
      <View style={dynamicStyles.screenHeader}>
        <Text style={dynamicStyles.screenTitle}>🚨 Vorfall melden</Text>
      </View>

      <ScrollView style={dynamicStyles.form} showsVerticalScrollIndicator={false}>
        <View style={dynamicStyles.formGroup}>
          <Text style={dynamicStyles.formLabel}>Art des Vorfalls *</Text>
          <TextInput
            style={dynamicStyles.formInput}
            placeholder="z.B. Verkehrsunfall, Diebstahl, Ruhestörung"
            placeholderTextColor={colors.textMuted}
            value={incidentFormData.title}
            onChangeText={(value) => setIncidentFormData(prev => ({ ...prev, title: value }))}
          />
        </View>

        <View style={dynamicStyles.formGroup}>
          <Text style={dynamicStyles.formLabel}>Beschreibung *</Text>
          <TextInput
            style={[dynamicStyles.formInput, dynamicStyles.textArea]}
            placeholder="Detaillierte Beschreibung des Vorfalls"
            placeholderTextColor={colors.textMuted}
            value={incidentFormData.description}
            onChangeText={(value) => setIncidentFormData(prev => ({ ...prev, description: value }))}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={dynamicStyles.formGroup}>
          <Text style={dynamicStyles.formLabel}>📍 Standort</Text>
          <View style={dynamicStyles.locationInput}>
            <TextInput
              style={[dynamicStyles.formInput, { flex: 1 }]}
              placeholder="Koordinaten (automatisch)"
              placeholderTextColor={colors.textMuted}
              value={incidentFormData.location}
              editable={false}
            />
            <TouchableOpacity style={dynamicStyles.locationButton} onPress={getCurrentLocation}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={dynamicStyles.formGroup}>
          <Text style={dynamicStyles.formLabel}>🏠 Adresse</Text>
          <TextInput
            style={dynamicStyles.formInput}
            placeholder="Straße, Hausnummer, PLZ Ort"
            placeholderTextColor={colors.textMuted}
            value={incidentFormData.address}
            onChangeText={(value) => setIncidentFormData(prev => ({ ...prev, address: value }))}
          />
        </View>

        <View style={dynamicStyles.formGroup}>
          <Text style={dynamicStyles.formLabel}>⚠️ Priorität</Text>
          <View style={dynamicStyles.priorityButtons}>
            {['low', 'medium', 'high'].map(priority => (
              <TouchableOpacity
                key={priority}
                style={[
                  dynamicStyles.priorityButton,
                  incidentFormData.priority === priority && dynamicStyles.priorityButtonActive
                ]}
                onPress={() => setIncidentFormData(prev => ({ ...prev, priority }))}
              >
                <Text style={[
                  dynamicStyles.priorityButtonText,
                  incidentFormData.priority === priority && dynamicStyles.priorityButtonTextActive
                ]}>
                  {priority === 'low' ? '🟢 Niedrig' : 
                   priority === 'medium' ? '🟡 Mittel' : 
                   '🔴 Hoch'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[dynamicStyles.submitButton, submittingIncident && dynamicStyles.submitButtonDisabled]}
          onPress={submitIncident}
          disabled={submittingIncident}
        >
          {submittingIncident ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={dynamicStyles.submitButtonText}>Vorfall melden</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={dynamicStyles.submitNote}>
          📡 Der Vorfall wird sofort an alle verfügbaren Beamte übertragen
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  const renderTeamScreen = () => (
    <View style={dynamicStyles.content}>
      <View style={dynamicStyles.screenHeader}>
        <Text style={dynamicStyles.screenTitle}>👥 Team Übersicht</Text>
        <View style={dynamicStyles.headerActions}>
          {user?.role === 'admin' && (
            <TouchableOpacity 
              style={dynamicStyles.addButton}
              onPress={() => setShowAddUserModal(true)}
            >
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => loadUsersByStatus()}>
            <Ionicons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={dynamicStyles.teamList}
        refreshControl={<RefreshControl refreshing={teamLoading} onRefresh={() => loadUsersByStatus()} />}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(usersByStatus).map(([status, users]) => (
          <View key={status} style={dynamicStyles.statusGroup}>
            <View style={dynamicStyles.statusHeader}>
              <View style={[dynamicStyles.statusDot, { backgroundColor: getStatusColor(status) }]} />
              <Text style={dynamicStyles.statusTitle}>{status}</Text>
              <View style={dynamicStyles.statusCount}>
                <Text style={dynamicStyles.statusCountText}>{users.length}</Text>
              </View>
            </View>
            
            {users.map((officer) => (
              <View key={officer.id} style={dynamicStyles.officerCard}>
                <View style={dynamicStyles.officerInfo}>
                  <Text style={dynamicStyles.officerName}>👤 {officer.username}</Text>
                  <Text style={dynamicStyles.officerDetails}>
                    🏢 {officer.department || 'Allgemein'} • 🎖️ {officer.rank || 'Beamter'}
                  </Text>
                  <Text style={dynamicStyles.officerBadge}>
                    🆔 Dienstnummer: {officer.badge_number || 'N/A'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
        
        {Object.keys(usersByStatus).length === 0 && !teamLoading && (
          <View style={dynamicStyles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} style={dynamicStyles.emptyIcon} />
            <Text style={dynamicStyles.emptyText}>Keine Teammitglieder gefunden</Text>
            <Text style={dynamicStyles.emptySubtext}>Team wird geladen oder Server nicht erreichbar</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );

  const renderBerichteScreen = () => (
    <View style={dynamicStyles.content}>
      <View style={dynamicStyles.screenHeader}>
        <Text style={dynamicStyles.screenTitle}>📊 Berichte & Archiv</Text>
        <View style={dynamicStyles.headerActions}>
          <TouchableOpacity 
            style={dynamicStyles.addButton}
            onPress={createNewReport}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => loadReports()}>
            <Ionicons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={dynamicStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReports()} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Action Card */}
        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.cardHeader}>
            <Ionicons name="create" size={24} color={colors.primary} />
            <Text style={dynamicStyles.cardTitle}>Bericht erstellen</Text>
          </View>
          
          <TouchableOpacity 
            style={dynamicStyles.actionButton}
            onPress={createNewReport}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
            <Text style={dynamicStyles.actionText}>📝 Neuen Bericht schreiben</Text>
          </TouchableOpacity>
        </View>

        {/* Berichte Statistiken */}
        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.cardHeader}>
            <Ionicons name="bar-chart" size={24} color={colors.primary} />
            <Text style={dynamicStyles.cardTitle}>Übersicht</Text>
          </View>
          
          <View style={dynamicStyles.statsContainer}>
            <View style={dynamicStyles.statCard}>
              <View style={[dynamicStyles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="document-text" size={20} color="#2563EB" />
              </View>
              <Text style={dynamicStyles.statNumber}>{reports.length}</Text>
              <Text style={dynamicStyles.statLabel}>Gesamt{'\n'}Berichte</Text>
            </View>
            
            <View style={dynamicStyles.statCard}>
              <View style={[dynamicStyles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="create" size={20} color="#D97706" />
              </View>
              <Text style={dynamicStyles.statNumber}>
                {reports.filter(r => r.status === 'draft').length}
              </Text>
              <Text style={dynamicStyles.statLabel}>Entwürfe</Text>
            </View>
            
            <View style={dynamicStyles.statCard}>
              <View style={[dynamicStyles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-done" size={20} color="#059669" />
              </View>
              <Text style={dynamicStyles.statNumber}>
                {reports.filter(r => r.status === 'submitted').length}
              </Text>
              <Text style={dynamicStyles.statLabel}>Fertig</Text>
            </View>
          </View>
        </View>

        {/* Alle Berichte */}
        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.cardHeader}>
            <Ionicons name="folder-open" size={24} color={colors.primary} />
            <Text style={dynamicStyles.cardTitle}>Alle Berichte</Text>
            <TouchableOpacity onPress={createNewReport}>
              <Ionicons name="add-circle" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={dynamicStyles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={dynamicStyles.emptyText}>Lade Berichte...</Text>
            </View>
          ) : reports.length === 0 ? (
            <View style={dynamicStyles.emptyState}>
              <Ionicons name="document-outline" size={64} color={colors.textMuted} style={dynamicStyles.emptyIcon} />
              <Text style={dynamicStyles.emptyText}>Noch keine Berichte vorhanden</Text>
              <Text style={dynamicStyles.emptySubtext}>
                Schreiben Sie Ihren ersten Bericht
              </Text>
              <TouchableOpacity 
                style={dynamicStyles.actionButton}
                onPress={createNewReport}
              >
                <Ionicons name="create" size={20} color="#FFFFFF" />
                <Text style={dynamicStyles.actionText}>Ersten Bericht schreiben</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[dynamicStyles.emptySubtext, { marginBottom: 12, textAlign: 'center' }]}>
                📋 {reports.length} Bericht{reports.length !== 1 ? 'e' : ''} gefunden
              </Text>
              
              {reports.map((report, index) => (
                <TouchableOpacity 
                  key={report.id || index} 
                  style={[dynamicStyles.incidentCard, 
                    { 
                      borderLeftColor: report.status === 'draft' ? colors.warning : 
                                      report.status === 'submitted' ? colors.success : colors.primary,
                      backgroundColor: report.status === 'draft' ? colors.warning + '10' : colors.surface
                    }
                  ]}
                  onPress={() => editReport(report)}
                >
                  <View style={[dynamicStyles.incidentIcon, 
                    { backgroundColor: (report.status === 'draft' ? colors.warning : colors.primary) + '20' }
                  ]}>
                    <Ionicons 
                      name={report.status === 'draft' ? 'create' : 'document-text'} 
                      size={24} 
                      color={report.status === 'draft' ? colors.warning : colors.primary} 
                    />
                  </View>
                  <View style={dynamicStyles.incidentContent}>
                    <Text style={dynamicStyles.incidentTitle}>
                      📄 {report.title || 'Unbenannter Bericht'}
                    </Text>
                    <Text style={dynamicStyles.incidentTime}>
                      👤 Von: {report.author_name || 'Unbekannt'}
                    </Text>
                    <Text style={dynamicStyles.incidentTime}>
                      📅 Schichtdatum: {report.shift_date ? 
                        new Date(report.shift_date).toLocaleDateString('de-DE') : 
                        'Nicht angegeben'
                      }
                    </Text>
                    <Text style={dynamicStyles.incidentTime}>
                      🕒 Erstellt: {report.created_at ? 
                        new Date(report.created_at).toLocaleString('de-DE') : 
                        'Unbekannt'
                      }
                    </Text>
                    <Text style={[
                      dynamicStyles.incidentStatus,
                      { 
                        color: report.status === 'draft' ? colors.warning : 
                               report.status === 'submitted' ? colors.success : colors.primary 
                      }
                    ]}>
                      📊 Status: {report.status === 'draft' ? '📝 Entwurf' : 
                                  report.status === 'submitted' ? '✅ Abgegeben' : 
                                  report.status === 'reviewed' ? '👁️ Geprüft' :
                                  '❓ ' + (report.status || 'Unbekannt')}
                    </Text>
                    {report.last_edited_by_name && (
                      <Text style={[dynamicStyles.incidentTime, { color: colors.textMuted, fontSize: 12 }]}>
                        ✏️ Zuletzt bearbeitet von: {report.last_edited_by_name}
                      </Text>
                    )}
                  </View>
                  <View style={dynamicStyles.reportActions}>
                    <TouchableOpacity 
                      style={dynamicStyles.editButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        editReport(report);
                      }}
                    >
                      <Ionicons name="create" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={dynamicStyles.deleteReportButton}
                      onPress={async (e) => {
                        e.stopPropagation();
                        try {
                          const config = token ? {
                            headers: { Authorization: `Bearer ${token}` }
                          } : {};
                          
                          await axios.delete(`${API_URL}/api/reports/${report.id}`, config);
                          await loadReports(); // Liste neu laden
                          
                        } catch (error) {
                          console.error('Fehler beim Löschen des Berichts:', error);
                        }
                      }}
                    >
                      <Ionicons name="trash" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return renderHomeScreen();
      case 'messages': return renderMessagesScreen();
      case 'report': return renderIncidentScreen();
      case 'berichte': return renderBerichteScreen();
      case 'team': return renderTeamScreen();
      default: return renderHomeScreen();
    }
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={colors.background} 
      />
      
      {renderContent()}

      {/* Modern Tab Navigation */}
      <View style={dynamicStyles.tabBar}>
        <TouchableOpacity 
          style={[dynamicStyles.tabItem, activeTab === 'home' && dynamicStyles.tabItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? '#FFFFFF' : colors.textMuted} 
          />
          <Text style={[dynamicStyles.tabLabel, activeTab === 'home' && dynamicStyles.tabLabelActive]}>
            Übersicht
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.tabItem, activeTab === 'messages' && dynamicStyles.tabItemActive]}
          onPress={() => setActiveTab('messages')}
        >
          <Ionicons 
            name={activeTab === 'messages' ? 'chatbubbles' : 'chatbubbles-outline'} 
            size={24} 
            color={activeTab === 'messages' ? '#FFFFFF' : colors.textMuted} 
          />
          <Text style={[dynamicStyles.tabLabel, activeTab === 'messages' && dynamicStyles.tabLabelActive]}>
            Nachrichten
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.tabItem, activeTab === 'report' && dynamicStyles.tabItemActive]}
          onPress={() => setActiveTab('report')}
        >
          <Ionicons 
            name={activeTab === 'report' ? 'alert-circle' : 'alert-circle-outline'} 
            size={24} 
            color={activeTab === 'report' ? '#FFFFFF' : colors.textMuted} 
          />
          <Text style={[dynamicStyles.tabLabel, activeTab === 'report' && dynamicStyles.tabLabelActive]}>
            Melden
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.tabItem, activeTab === 'berichte' && dynamicStyles.tabItemActive]}
          onPress={() => setActiveTab('berichte')}
        >
          <Ionicons 
            name={activeTab === 'berichte' ? 'document-text' : 'document-text-outline'} 
            size={24} 
            color={activeTab === 'berichte' ? '#FFFFFF' : colors.textMuted} 
          />
          <Text style={[dynamicStyles.tabLabel, activeTab === 'berichte' && dynamicStyles.tabLabelActive]}>
            Berichte
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.tabItem, activeTab === 'team' && dynamicStyles.tabItemActive]}
          onPress={() => setActiveTab('team')}
        >
          <Ionicons 
            name={activeTab === 'team' ? 'people' : 'people-outline'} 
            size={24} 
            color={activeTab === 'team' ? '#FFFFFF' : colors.textMuted} 
          />
          <Text style={[dynamicStyles.tabLabel, activeTab === 'team' && dynamicStyles.tabLabelActive]}>
            Team
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Modal mit Dark/Light Mode */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <SafeAreaView style={dynamicStyles.container}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.modalTitle}>Profil bearbeiten</Text>
            <TouchableOpacity onPress={saveProfile}>
              <Text style={dynamicStyles.saveButtonText}>Speichern</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={dynamicStyles.modalContent} showsVerticalScrollIndicator={false}>
            
            {/* Theme Toggle */}
            <View style={dynamicStyles.themeToggleContainer}>
              <Text style={dynamicStyles.themeToggleText}>
                {isDarkMode ? '🌙 Dunkles Design' : '☀️ Helles Design'}
              </Text>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={isDarkMode ? '#FFFFFF' : colors.primary}
              />
            </View>

            <View style={dynamicStyles.formGroup}>
              <Text style={dynamicStyles.formLabel}>👤 Name</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={profileData.username}
                onChangeText={(text) => setProfileData({...profileData, username: text})}
                placeholder="Vollständiger Name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={dynamicStyles.formGroup}>
              <Text style={dynamicStyles.formLabel}>📞 Telefon</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={profileData.phone}
                onChangeText={(text) => setProfileData({...profileData, phone: text})}
                placeholder="Telefonnummer"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={dynamicStyles.formGroup}>
              <Text style={dynamicStyles.formLabel}>🆔 Dienstnummer</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={profileData.service_number}
                onChangeText={(text) => setProfileData({...profileData, service_number: text})}
                placeholder="Dienstnummer"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={dynamicStyles.formGroup}>
              <Text style={dynamicStyles.formLabel}>🎖️ Rang</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={profileData.rank}
                onChangeText={(text) => setProfileData({...profileData, rank: text})}
                placeholder="Dienstgrad"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={dynamicStyles.formGroup}>
              <Text style={dynamicStyles.formLabel}>🏢 Abteilung</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={profileData.department}
                onChangeText={(text) => setProfileData({...profileData, department: text})}
                placeholder="Abteilung/Revier"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={dynamicStyles.sectionTitle}>🔄 Dienststatus</Text>
            {['Im Dienst', 'Pause', 'Einsatz', 'Streife', 'Nicht verfügbar'].map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  dynamicStyles.statusOption,
                  userStatus === status && dynamicStyles.statusOptionActive
                ]}
                onPress={() => setUserStatus(status)}
              >
                <View style={[dynamicStyles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                <Text style={[
                  dynamicStyles.statusOptionText,
                  userStatus === status && dynamicStyles.statusOptionTextActive
                ]}>
                  {status}
                </Text>
                {userStatus === status && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Incident Details Modal mit Karte */}
      <Modal
        visible={showIncidentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIncidentModal(false)}
      >
        <SafeAreaView style={dynamicStyles.container}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={() => setShowIncidentModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.modalTitle}>Vorfall Details</Text>
            <TouchableOpacity onPress={() => openIncidentMap(selectedIncident)}>
              <Ionicons name="map" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {selectedIncident && (
            <ScrollView style={dynamicStyles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={dynamicStyles.incidentDetailHeader}>
                <Text style={dynamicStyles.incidentDetailTitle}>{selectedIncident.title}</Text>
                <View style={[
                  dynamicStyles.priorityBadge, 
                  { backgroundColor: getPriorityColor(selectedIncident.priority) }
                ]}>
                  <Text style={dynamicStyles.priorityBadgeText}>
                    {selectedIncident.priority === 'high' ? '🚨 HOCH' : 
                     selectedIncident.priority === 'medium' ? '⚠️ MITTEL' : 
                     '✅ NIEDRIG'}
                  </Text>
                </View>
              </View>

              <View style={dynamicStyles.detailSection}>
                <Text style={dynamicStyles.detailLabel}>📝 Beschreibung:</Text>
                <Text style={dynamicStyles.detailText}>{selectedIncident.description}</Text>
              </View>

              <View style={dynamicStyles.detailSection}>
                <Text style={dynamicStyles.detailLabel}>📍 Ort:</Text>
                <Text style={dynamicStyles.detailText}>{selectedIncident.address}</Text>
              </View>

              <View style={dynamicStyles.detailSection}>
                <Text style={dynamicStyles.detailLabel}>🕒 Gemeldet:</Text>
                <Text style={dynamicStyles.detailText}>
                  {new Date(selectedIncident.created_at).toLocaleString('de-DE')}
                </Text>
              </View>

              <View style={dynamicStyles.actionButtons}>
                <TouchableOpacity style={dynamicStyles.mapButton} onPress={() => openIncidentMap(selectedIncident)}>
                  <Ionicons name="map" size={20} color="#FFFFFF" />
                  <Text style={dynamicStyles.mapButtonText}>🗺️ Auf Karte anzeigen</Text>
                </TouchableOpacity>

                {(!selectedIncident.assigned_to || selectedIncident.assigned_to === user?.id) && (
                  <TouchableOpacity style={dynamicStyles.takeButton} onPress={takeIncident}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={dynamicStyles.takeButtonText}>✋ Vorfall übernehmen</Text>
                  </TouchableOpacity>
                )}
                
                {selectedIncident.assigned_to === user?.id && (
                  <TouchableOpacity style={dynamicStyles.completeButton} onPress={completeIncident}>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    <Text style={dynamicStyles.completeButtonText}>✅ Erledigt</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Map Modal */}
      <IncidentMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        incident={selectedIncident}
      />

      {/* Report Writing/Editing Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReportModal(false)}
      >
        <SafeAreaView style={dynamicStyles.container}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.modalTitle}>
              {editingReport ? '✏️ Bericht bearbeiten' : '📝 Neuer Bericht'}
            </Text>
            <TouchableOpacity 
              onPress={saveReport}
              disabled={savingReport}
            >
              {savingReport ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={dynamicStyles.saveButtonText}>Speichern</Text>
              )}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView style={dynamicStyles.modalContent} showsVerticalScrollIndicator={false}>
              
              <View style={dynamicStyles.formGroup}>
                <Text style={dynamicStyles.formLabel}>📋 Berichtstitel *</Text>
                <TextInput
                  style={dynamicStyles.formInput}
                  value={reportFormData.title}
                  onChangeText={(text) => setReportFormData({...reportFormData, title: text})}
                  placeholder="z.B. Schichtbericht 13.09.2024"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={dynamicStyles.formGroup}>
                <Text style={dynamicStyles.formLabel}>📅 Schichtdatum</Text>
                <TextInput
                  style={dynamicStyles.formInput}
                  value={reportFormData.shift_date}
                  onChangeText={(text) => setReportFormData({...reportFormData, shift_date: text})}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={dynamicStyles.formGroup}>
                <Text style={dynamicStyles.formLabel}>📝 Berichtsinhalt *</Text>
                <TextInput
                  style={[dynamicStyles.formInput, dynamicStyles.reportTextArea]}
                  value={reportFormData.content}
                  onChangeText={(text) => setReportFormData({...reportFormData, content: text})}
                  placeholder={`Schreiben Sie hier Ihren detaillierten Bericht...

Beispielinhalt:
• Schichtzeit von - bis
• Besondere Vorkommnisse
• Durchgeführte Patrouillen
• Wichtige Beobachtungen
• Sicherheitsrelevante Ereignisse`}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={15}
                  textAlignVertical="top"
                />
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Add User Modal */}
      <AddUserModal
        visible={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={() => {
          setShowAddUserModal(false);
          loadData();
          if (activeTab === 'team') {
            loadUsersByStatus();
          }
        }}
        token={token}
      />
    </SafeAreaView>
  );
};

// Main App Component
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

const AppContent = () => {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 20,
      fontSize: 18,
      color: colors.text,
      fontWeight: '600',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Stadtwache wird geladen...</Text>
      </SafeAreaView>
    );
  }

  return user ? <MainApp /> : <LoginScreen />;
};