import { Platform } from 'react-native';

/**
 * TOKEN CACHE VERSION 3.0 (SUPER STABLE)
 * This version ONLY uses AsyncStorage.
 */
const STABLE_TOKEN_CACHE_V3 = {
    async getToken(key: string) {
        if (Platform.OS === 'web') return null;

        try {
            console.log('>>> [TokenCache V3] Getting:', key);
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            return await AsyncStorage.getItem(key);
        } catch (error) {
            console.error('>>> [TokenCache V3] Get Error:', error);
        }
        return null;
    },
    async saveToken(key: string, value: string) {
        if (Platform.OS === 'web') return;

        try {
            console.log('>>> [TokenCache V3] Saving:', key);
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem(key, value);
        } catch (error) {
            console.error('>>> [TokenCache V3] Save Error:', error);
        }
    },
};

export default STABLE_TOKEN_CACHE_V3;
