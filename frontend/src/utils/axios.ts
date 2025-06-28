import axios from 'axios';

// Kreiraj instancu axios-a sa defaultnim postavkama
export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  timeout: 15000, // 15 sekundi timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Funkcija koja provjerava da li je localStorage dostupan (nije dostupan u server komponenti)
const isLocalStorageAvailable = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Dodaj interceptor za postavljanje tokena u zaglavlje
axiosInstance.interceptors.request.use(
  (config) => {
    // Sigurno dohvatanje tokena samo kada je localStorage dostupan
    if (isLocalStorageAvailable()) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      console.log('localStorage nije dostupan, ne mogu postaviti Authorization header');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor za obradu grešaka odgovora
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // DEBUGIRANJE: Privremeno onemogućeno preusmjeravanje na 401 greške
      if (error.response.status === 401 && isLocalStorageAvailable() && typeof window !== 'undefined') {
        console.error('DEBUG AXIOS ERROR 401:', error.response.data);
        console.error('DEBUG AXIOS CONFIG:', error.config);
        console.error('DEBUG AXIOS HEADERS:', error.config.headers);
        // localStorage.removeItem('auth_token');
        // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
