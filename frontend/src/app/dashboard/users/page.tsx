'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '@/types';
import { getUsers, deleteUser } from '@/lib/apiService';
import withAuth from '@/components/auth/withAuth';
import AddUserModal from '@/components/users/AddUserModal';
import { FiPlus, FiEdit, FiTrash2, FiLoader, FiEye } from 'react-icons/fi'; // Keeping these, common icons
import { FaUserAlt, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa'; // FaUserCog not used, FaExclamationTriangle not used directly
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button'; // Assuming this Button uses theme colors
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'; // For potential future use or consistency

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Neuspješno dohvatanje korisnika.'); // Corrected spelling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Da li ste sigurni da želite da obrišete ovog korisnika?')) {
      setDeletingUserId(userId);
      try {
        await deleteUser(userId);
        setUsers(users.filter(user => user.id !== userId));
        toast.success('Korisnik uspešno obrisan.');
      } catch (error) {
        console.error('Failed to delete user:', error);
        toast.error('Neuspešno brisanje korisnika.');
      } finally {
        setDeletingUserId(null);
      }
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    // Using theme colors for badges. Gradients are preserved as they are specific.
    // Consider if these gradients should be defined in theme or if plain colors are preferred for badges.
    // If plain, use bg-primary, bg-secondary, bg-destructive, etc.
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-gradient-to-r from-primary to-red-600 text-primary-foreground'; // Primary is red
      case UserRole.SERVICER:
        return 'bg-gradient-to-r from-secondary to-blue-600 text-secondary-foreground'; // Secondary is blue
      case UserRole.FUEL_OPERATOR:
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'; // Keep green for fuel ops
      case UserRole.KONTROLA:
        return 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'; // Keep purple
      case UserRole.CARINA:
        return 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'; // Keep amber/yellow
      case UserRole.AERODROM:
        return 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white'; // Keep sky/cyan
      default:
        return 'bg-gradient-to-r from-muted to-slate-500 text-muted-foreground'; // Muted for default
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-150px)] bg-white">
        <motion.div 
          className="h-16 w-16 rounded-full border-t-4 border-b-4 border-[#e53e3e]" 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-lg font-medium text-gray-700 mt-4">
          Učitavanje korisnika...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 p-4 md:p-6 bg-white text-gray-800 min-h-screen" 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Section - Glassmorphism dizajn */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4d4c4c] to-[#1a1a1a] shadow-lg rounded-xl p-6 border border-white/10">
        {/* Dekorativne sjene u uglovima */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e53e3e]/20 rounded-full filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#e53e3e]/20 rounded-full filter blur-3xl opacity-30 translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
          <div className="flex items-center">
            <div className="p-3 bg-[#e53e3e]/20 backdrop-blur-md rounded-xl mr-4 border border-white/10">
              <FaUserAlt className="h-6 w-6 text-[#e53e3e]" />
            </div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-2xl md:text-3xl font-bold text-white"
              >
                Upravljanje Korisnicima
              </motion.h1>
              <p className="text-sm text-white/70 mt-1">Pregled i upravljanje korisničkim računima sistema</p>
            </div>
          </div>
          <Button 
            className="bg-[#e53e3e]/80 hover:bg-[#e53e3e] text-white border border-white/20 shadow-lg backdrop-blur-md rounded-xl transition-all duration-300"
            onClick={() => setIsAddUserModalOpen(true)}
          >
            <FiPlus className="mr-2" />
            Dodaj Novog Korisnika
          </Button>
        </div>
      </div>

      {/* Users List - Glassmorphism dizajn */}
      <div className="relative overflow-hidden border border-gray-200 bg-white shadow-lg rounded-xl">
        {/* Dekorativne sjene u uglovima */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#4FC3C7]/10 rounded-full filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#e53e3e]/10 rounded-full filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/4"></div>
        
        {loading && users.length > 0 && (
          <div className="absolute top-4 right-4 z-20">
            <motion.div 
              className="h-6 w-6 rounded-full border-t-2 border-b-2 border-[#e53e3e]" 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}
        
        <div className="relative z-10">
          {users.length === 0 && !loading ? (
            <div className="text-center py-16 px-4">
              <div className="w-24 h-24 mx-auto bg-[#e53e3e]/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-gray-200 shadow-lg">
                <FaUserAlt className="h-10 w-10 text-[#e53e3e]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">
                Nema pronađenih korisnika
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Trenutno nema korisnika u sistemu. Dodajte prvog korisnika klikom na dugme ispod.
              </p>
              <Button 
                className="bg-[#e53e3e]/80 hover:bg-[#e53e3e] text-white border border-white/20 shadow-lg backdrop-blur-md rounded-xl transition-all duration-300 mx-auto"
                onClick={() => setIsAddUserModalOpen(true)}
              >
                <FiPlus className="mr-2" />
                Dodaj Novog Korisnika
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Korisničko ime</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Uloga</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Kreiran</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-700 uppercase tracking-wider text-center">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <motion.tr 
                      key={user.id} 
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200" 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-[#4FC3C7]/20 backdrop-blur-md rounded-xl mr-3 border border-white/10">
                            <FaUserAlt className="text-[#4FC3C7]" /> 
                          </div>
                          <span className="font-medium text-gray-800">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)} shadow-sm`}>
                            {user.role === UserRole.ADMIN ? 'Administrator' : 
                             user.role === UserRole.SERVICER ? 'Serviser' : 
                             user.role === UserRole.FUEL_OPERATOR ? 'Operater Goriva' :
                             user.role === UserRole.KONTROLA ? 'Kontrola' :
                             user.role === UserRole.CARINA ? 'Carina' :
                             user.role === UserRole.AERODROM ? 'Aerodrom' : user.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-[#FBBF24]/20 backdrop-blur-md rounded-xl mr-3 border border-white/10">
                            <FaCalendarAlt className="text-[#FBBF24]" /> 
                          </div>
                          <span className="text-gray-600">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-3">
                          <Button
                            className="h-9 w-9 bg-[#4FC3C7]/20 backdrop-blur-md rounded-xl border border-white/10 text-[#4FC3C7] hover:bg-[#4FC3C7]/30 transition-all duration-300"
                            disabled
                            aria-label="Pregledaj Korisnika"
                          >
                            <FiEye size={16} />
                          </Button>
                          <Button
                            className="h-9 w-9 bg-[#FBBF24]/20 backdrop-blur-md rounded-xl border border-white/10 text-[#FBBF24] hover:bg-[#FBBF24]/30 transition-all duration-300"
                            disabled
                            aria-label="Izmeni Korisnika"
                          >
                            <FiEdit size={16} />
                          </Button>
                          <Button
                            className="h-9 w-9 bg-[#e53e3e]/20 backdrop-blur-md rounded-xl border border-white/10 text-[#e53e3e] hover:bg-[#e53e3e]/30 transition-all duration-300"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deletingUserId === user.id}
                            aria-label="Obriši Korisnika"
                          >
                            {deletingUserId === user.id ? (
                              <motion.div 
                                animate={{ rotate: 360 }} 
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <FiLoader size={16} className="text-[#e53e3e]" />
                              </motion.div>
                            ) : (
                              <FiTrash2 size={16} />
                            )}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddUserModal 
        isOpen={isAddUserModalOpen} 
        onClose={() => setIsAddUserModalOpen(false)} 
        onUserAdded={() => {
          fetchUsers();
          setIsAddUserModalOpen(false);
        }}
        // Ensure AddUserModal is also themed, if it's a custom component
      />
    </motion.div>
  );
};

export default withAuth(UserManagementPage, [UserRole.ADMIN]);