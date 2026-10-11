import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default live production cloud server URL (Hosted on Vercel)
const DEFAULT_SERVER_URL = 'https://pickfresh-mobile.vercel.app';
const STORAGE_KEY_URL = '@pickfresh_server_url';

export default function App() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_SERVER_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const webViewRef = useRef(null);

  // Load persisted server URL on startup
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_URL);
        if (saved) {
          setServerUrl(saved);
          setInputUrl(saved);
        }
      } catch (e) {
        console.warn('Failed to load saved server URL:', e);
      }
    })();
  }, []);

  // Handle Android Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // handled
      }
      return false; // let system handle (minimize or exit)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleSaveUrl = async () => {
    let cleanUrl = inputUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      setServerUrl(cleanUrl);
      setHasError(false);
      setIsLoading(true);
      setShowSettings(false);
      if (webViewRef.current) {
        webViewRef.current.reload();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save server URL');
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // Inject script to inform Web app that it's embedded in React Native
  const injectedJavaScript = `
    (function() {
      window.isReactNative = true;
      document.body.classList.add('in-react-native');
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NATIVE_READY' }));
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#2E7D32" />

      {/* Main WebView Container */}
      <View style={styles.webContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: serverUrl }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          scalesPageToFit={false}
          mixedContentMode="always"
          originWhitelist={['*']}
          userAgent="PickFreshApp/1.0.0 (ReactNative; Android/iOS)"
          injectedJavaScript={injectedJavaScript}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error:', nativeEvent);
            setIsLoading(false);
            setHasError(true);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 400) {
              console.warn('WebView HTTP error:', nativeEvent.statusCode);
            }
          }}
        />

        {/* Loading Spinner Screen */}
        {isLoading && !hasError && (
          <View style={styles.overlayLoading}>
            <View style={styles.loaderCard}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingTitle}>PickFresh</Text>
              <Text style={styles.loadingSubtitle}>Connecting to Mobile App...</Text>
            </View>
          </View>
        )}

        {/* Connection Failure / Offline Screen */}
        {hasError && (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>📡</Text>
              <Text style={styles.errorTitle}>Cannot Connect to Server</Text>
              <Text style={styles.errorText}>
                Unable to reach the PickFresh dev server at:{'\n'}
                <Text style={styles.codeText}>{serverUrl}</Text>
              </Text>
              <Text style={styles.errorHint}>
                1. Make sure your backend and frontend are running on your computer.{'\n'}
                2. Ensure your phone and PC are connected to the SAME Wi-Fi network.
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
                  <Text style={styles.primaryButtonText}>🔄 Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowSettings(true)}
                >
                  <Text style={styles.secondaryButtonText}>⚙️ Change IP</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Server IP Configuration Modal */}
      <Modal visible={showSettings} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚙️ Mobile Server Configuration</Text>
            <Text style={styles.modalDesc}>
              Enter the local IP address of your development machine where Vite and Express are running:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="http://192.168.1.xxx:5173"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setInputUrl(serverUrl);
                  setShowSettings(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveUrl}>
                <Text style={styles.modalSaveText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : 0,
  },
  webContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F4F6F8',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topControlOverlay: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 999,
  },
  settingsButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  overlayLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loaderCard: {
    alignItems: 'center',
    padding: 24,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: -0.5,
  },
  loadingSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#2E7D32',
  },
  errorHint: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 18,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
