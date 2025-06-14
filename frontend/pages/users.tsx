import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useUserStore } from '../store/userStore';
import AddUserForm from '../components/AddUserForm';

import type { User } from '../store/userStore';

export default function UsersPage() {
  const user = useUserStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    setError('');
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${useUserStore.getState().token}` }
    })
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Greška pri učitavanju korisnika.');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      setError('Pristup dozvoljen samo administratorima.');
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [user]);

  if (!user) return null;
  if (loading) return <div>Učitavanje...</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <ProtectedRoute>
      <Layout>
        <h1 className="text-2xl font-bold mb-4">Korisnici</h1>
        <AddUserForm onSuccess={fetchUsers} />
        <table className="w-full bg-white shadow rounded">
          <thead>
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Korisničko ime</th>
              <th className="p-2 text-left">Rola</th>

            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.id}</td>
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.role}</td>

              </tr>
            ))}
          </tbody>
        </table>
      </Layout>
    </ProtectedRoute>
  );
}
