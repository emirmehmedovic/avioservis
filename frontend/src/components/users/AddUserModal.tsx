'use client';

import React, { useState } from 'react';
import { UserRole, CreateUserPayload } from '@/types';
import { createUser } from '@/lib/apiService';
import { toast } from 'react-hot-toast';
import { FiX, FiLoader, FiSave, FiAlertCircle } from 'react-icons/fi';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void; // Callback to refresh user list
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FUEL_OPERATOR); // Default role
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | ''>('');

  // Validacija jake lozinke
  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (!password) {
      return { isValid: false, message: 'Lozinka je obavezna.' };
    }
    
    // Provjera duljine
    if (password.length < 8) {
      return { isValid: false, message: 'Lozinka mora imati najmanje 8 karaktera.' };
    }
    
    // Provjera velikih slova
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Lozinka mora sadržavati barem jedno veliko slovo.' };
    }
    
    // Provjera malih slova
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Lozinka mora sadržavati barem jedno malo slovo.' };
    }
    
    // Provjera brojeva
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Lozinka mora sadržavati barem jedan broj.' };
    }
    
    // Provjera specijalnih znakova
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { isValid: false, message: 'Lozinka mora sadržavati barem jedan specijalni znak (!@#$%^&*()_+-=[]{};\':"|,.<>/?).' };
    }
    
    return { isValid: true, message: '' };
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!username.trim()) newErrors.username = 'Korisničko ime je obavezno.';
    else if (username.trim().length < 3) newErrors.username = 'Korisničko ime mora imati najmanje 3 karaktera.';
    
    // Validacija lozinke
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.message;
    }
    
    if (!role) newErrors.role = 'Uloga je obavezna.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const payload: CreateUserPayload = { username, password, role };

    try {
      await createUser(payload);
      toast.success('Korisnik uspešno dodat!');
      onUserAdded(); // Refresh user list
      onClose(); // Close modal
      // Reset form fields
      setUsername('');
      setPassword('');
      setRole(UserRole.FUEL_OPERATOR);
      setErrors({});
    } catch (error: any) {
      console.error('Failed to create user:', error);
      if (error.message && error.message.toLowerCase().includes('username already exists')) {
        setErrors(prev => ({...prev, username: 'Korisničko ime već postoji.'}));
        toast.error('Korisničko ime već postoji.');
      } else {
        toast.error(error.message || 'Neuspešno dodavanje korisnika.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Dodaj Novog Korisnika</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Korisničko ime</label>
            <input 
              type="text" 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className={`mt-1 block w-full px-3 py-2 border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Lozinka</label>
            <input 
              type="password" 
              id="password" 
              value={password} 
              onChange={(e) => {
                setPassword(e.target.value);
                // Provjera snage lozinke
                const val = e.target.value;
                if (!val) {
                  setPasswordStrength('');
                } else if (validatePassword(val).isValid) {
                  setPasswordStrength('strong');
                } else if (val.length >= 8 && 
                          (/[A-Z]/.test(val) || /[a-z]/.test(val)) && 
                          /[0-9]/.test(val)) {
                  setPasswordStrength('medium');
                } else {
                  setPasswordStrength('weak');
                }
              }} 
              className={`mt-1 block w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            
            {/* Indikator snage lozinke */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="text-xs mr-2">Snaga lozinke:</div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : passwordStrength === 'strong' ? 'bg-green-500' : ''}`}
                      style={{ width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%' }}
                    ></div>
                  </div>
                  <div className="ml-2 text-xs">
                    {passwordStrength === 'weak' ? 'Slaba' : passwordStrength === 'medium' ? 'Srednja' : 'Jaka'}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-500">
              <p>Lozinka mora sadržavati:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Najmanje 8 karaktera</li>
                <li>Najmanje jedno veliko slovo (A-Z)</li>
                <li>Najmanje jedno malo slovo (a-z)</li>
                <li>Najmanje jedan broj (0-9)</li>
                <li>Najmanje jedan specijalni znak (!@#$%^&*...)</li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Uloga</label>
            <select 
              id="role" 
              value={role} 
              onChange={(e) => setRole(e.target.value as UserRole)} 
              className={`mt-1 block w-full px-3 py-2 border ${errors.role ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            >
              {Object.values(UserRole).map((r) => (
                <option key={r} value={r}>
                  {r === 'ADMIN' ? 'Administrator' : 
                   r === 'SERVICER' ? 'Serviser' : 
                   r === 'FUEL_OPERATOR' ? 'Operater Goriva' : 
                   r === 'KONTROLA' ? 'Kontrola' :
                   r === 'CARINA' ? 'Carina' :
                   r === 'AERODROM' ? 'Aerodrom' : r}
                </option>
              ))}
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
          </div>

          <div className="flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Otkaži
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <FiLoader className="animate-spin mr-2" /> : <FiSave className="mr-2" />} 
              Sačuvaj Korisnika
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
