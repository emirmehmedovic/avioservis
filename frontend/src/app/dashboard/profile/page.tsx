'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { changePassword } from '@/lib/apiService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, User, Shield, Calendar, Mail, Key, AlertTriangle } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { authUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState({
    current: false,
    new: false,
    confirm: false
  });
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

  // Provjera snage lozinke i ažuriranje indikatora
  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength('');
      return;
    }
    
    if (validatePassword(password).isValid) {
      setPasswordStrength('strong');
    } else if (
      password.length >= 8 && 
      ((/[A-Z]/.test(password) && /[a-z]/.test(password)) || /[0-9]/.test(password))
    ) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('weak');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('Nova lozinka i potvrda lozinke se ne podudaraju.');
      return;
    }

    // Validacija jake lozinke
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await changePassword({
        currentPassword,
        newPassword
      });
      setSuccess(response.message || 'Lozinka uspješno promijenjena.');
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength('');
    } catch (err: any) {
      setError(err.message || 'Greška prilikom promjene lozinke.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setPasswordVisible(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <DashboardHeader title="Moj Profil" subtitle="Upravljajte svojim korisničkim podacima" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-32 flex items-end justify-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-white flex items-center justify-center text-2xl font-bold text-indigo-700 mb-[-3rem] shadow-lg">
                  {authUser?.username.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="p-6 pt-16 text-center">
                <h2 className="text-xl font-semibold mb-1">{authUser?.username}</h2>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mb-4">
                  <Shield size={12} className="mr-1" />
                  {authUser?.role}
                </div>
                
                <div className="mt-6 space-y-4 text-left">
                  <div className="flex items-center text-sm">
                    <User size={16} className="mr-3 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Korisničko ime</p>
                      <p className="font-medium">{authUser?.username}</p>
                    </div>
                  </div>
                  
                  {authUser?.email && (
                    <div className="flex items-center text-sm">
                      <Mail size={16} className="mr-3 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium">{authUser?.email}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm">
                    <Calendar size={16} className="mr-3 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Datum registracije</p>
                      <p className="font-medium">{formatDate(authUser?.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <div className="p-6 border-b border-border">
                <div className="flex items-center">
                  <Key size={20} className="mr-3 text-indigo-600" />
                  <h2 className="text-xl font-semibold">Promjena Lozinke</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Ažurirajte svoju lozinku da biste osigurali sigurnost vašeg naloga</p>
              </div>
              
              <div className="p-6">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-destructive/10 text-destructive p-4 rounded-md mb-6 flex items-start"
                  >
                    <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
                
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-green-100 text-green-800 p-4 rounded-md mb-6 flex items-start"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                    <p>{success}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword" className="text-sm font-medium">Trenutna Lozinka</Label>
                      <div className="relative mt-1">
                        <Input
                          id="currentPassword"
                          type={passwordVisible.current ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pr-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                        <button 
                          type="button" 
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {passwordVisible.current ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="newPassword" className="text-sm font-medium">Nova Lozinka</Label>
                      <div className="relative mt-1">
                        <Input
                          id="newPassword"
                          type={passwordVisible.new ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            checkPasswordStrength(e.target.value);
                          }}
                          className="pr-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                        <button 
                          type="button" 
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {passwordVisible.new ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {/* Indikator snage lozinke */}
                      {newPassword && (
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
                    
                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">Potvrdi Novu Lozinku</Label>
                      <div className="relative mt-1">
                        <Input
                          id="confirmPassword"
                          type={passwordVisible.confirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pr-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                        <button 
                          type="button" 
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {passwordVisible.confirm ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isLoading} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md transition-colors"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Promjena u toku...
                        </>
                      ) : 'Promijeni Lozinku'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
