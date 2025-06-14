'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '@/types';
import { getUsers, deleteUser } from '@/lib/apiService';
import withAuth from '@/components/auth/withAuth';
import AddUserModal from '@/components/users/AddUserModal';
import { FiPlus, FiEdit, FiTrash2, FiLoader, FiEye } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

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
      toast.error('Failed to fetch users.');
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

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FiLoader className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Upravljanje Korisnicima</h1>
        <button 
          onClick={() => setIsAddUserModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
          title="Dodaj Novog Korisnika"
        >
          <FiPlus className="mr-2" /> Dodaj Novog Korisnika
        </button>
      </div>

      <AddUserModal 
        isOpen={isAddUserModalOpen} 
        onClose={() => setIsAddUserModalOpen(false)} 
        onUserAdded={() => {
          fetchUsers();
          setIsAddUserModalOpen(false);
        }}
      />

      {loading && users.length > 0 && (
        <div className="absolute top-4 right-4">
          <FiLoader className="animate-spin text-2xl text-blue-500" />
        </div>
      )}

      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">ID</th>
              <th className="py-3 px-6 text-left">Korisničko ime</th>
              <th className="py-3 px-6 text-left">Uloga</th>
              <th className="py-3 px-6 text-left">Kreiran</th>
              <th className="py-3 px-6 text-center">Akcije</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {users.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="py-3 px-6 text-center">Nema pronađenih korisnika.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{user.id}</td>
                  <td className="py-3 px-6 text-left">{user.username}</td>
                  <td className="py-3 px-6 text-left">{user.role}</td>
                  <td className="py-3 px-6 text-left">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center">
                      <button 
                        // onClick={() => { /* TODO: Open view user modal */ }}
                        className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 mr-2 disabled:opacity-50"
                        title="Pregledaj Korisnika (uskoro)"
                        disabled
                      >
                        <FiEye />
                      </button>
                      <button 
                        // onClick={() => { /* TODO: Open edit user modal */ }}
                        className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-600 mr-2 disabled:opacity-50"
                        title="Izmeni Korisnika (uskoro)"
                        disabled
                      >
                        <FiEdit />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)} 
                        className={`w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 disabled:opacity-50`}
                        disabled={deletingUserId === user.id}
                        title="Obriši Korisnika"
                      >
                        {deletingUserId === user.id ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default withAuth(UserManagementPage, [UserRole.ADMIN]);
