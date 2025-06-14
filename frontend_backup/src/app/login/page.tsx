'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { loginUser, LoginResponse } from '@/lib/apiService'; 
import { useAuth } from '@/contexts/AuthContext'; 

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 
  const { login, authToken, isLoading: authIsLoading, authUser } = useAuth(); 

  useEffect(() => {
    if (!authIsLoading && authToken && authUser) {
      router.push('/dashboard');
    }
  }, [authToken, authIsLoading, authUser, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!username || !password) {
      setError('Korisničko ime i lozinka su obavezni.');
      setLoading(false);
      return;
    }

    if (username.length < 3) {
        setError('Korisničko ime mora imati bar 3 karaktera.');
        setLoading(false);
        return;
    }
    if (password.length < 6) {
        setError('Lozinka mora imati bar 6 karaktera.');
        setLoading(false);
        return;
    }

    try {
      const data: LoginResponse = await loginUser({ username, password });
      login(data); 
    } catch (err: any) {
      console.error('Login page error:', err);
      setError(err.message || 'Došlo je do greške prilikom prijave.');
    } finally {
      setLoading(false);
    }
  };

  if (authIsLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <p>Učitavanje...</p> 
        </div>
    );
  }
  if (authUser) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <p>Već ste prijavljeni. Preusmjeravanje na dashboard...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white shadow-xl rounded-lg p-8 md:p-12 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Admin Prijava
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="username" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Korisničko ime
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="npr. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Lozinka
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="*******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Greška!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {loading ? 'Prijava u toku...' : 'Prijavi se'}
            </button>
          </div>
        </form>
      </div>
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AvioServis. Sva prava zadržana.</p>
      </footer>
    </div>
  );
}
