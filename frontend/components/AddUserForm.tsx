import { useState } from 'react';
import { useUserStore } from '../store/userStore';

interface Props {
  onSuccess: () => void;
}

export default function AddUserForm({ onSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = useUserStore((s) => s.token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Greška pri kreiranju korisnika');
      setUsername('');
      setPassword('');
      setRole('USER');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4 max-w-md">
      <h2 className="text-lg font-bold mb-2">Dodaj korisnika</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <input
        type="text"
        placeholder="Korisničko ime"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="w-full border p-2 rounded mb-2"
        required
      />
      <input
        type="password"
        placeholder="Lozinka"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border p-2 rounded mb-2"
        required
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        className="w-full border p-2 rounded mb-2"
      >
        <option value="USER">USER</option>
        <option value="SERVICER">SERVICER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <button
        type="submit"
        className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
        disabled={loading}
      >
        {loading ? 'Dodavanje...' : 'Dodaj korisnika'}
      </button>
    </form>
  );
}
