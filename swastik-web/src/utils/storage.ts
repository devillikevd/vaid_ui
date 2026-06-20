import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_STORAGE_SECRET || 'swastik-secure-storage-key';

export const secureStorage = {
  setItem: (key: string, value: any) => {
    try {
      const serializedValue = JSON.stringify(value);
      const encryptedValue = CryptoJS.AES.encrypt(serializedValue, SECRET_KEY).toString();
      localStorage.setItem(key, encryptedValue);
    } catch (e) {
      console.error('Error saving to secure storage', e);
    }
  },

  getItem: (key: string) => {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedValue, SECRET_KEY);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) return null;
      
      return JSON.parse(decryptedString);
    } catch (e) {
      console.error('Error reading from secure storage', e);
      return null;
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from secure storage', e);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Error clearing secure storage', e);
    }
  }
};
