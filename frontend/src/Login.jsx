import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Home } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('admin_token', data.access_token);
        navigate('/admin');
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      setError('Network error connecting to the server.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative p-4">
      {/* Back to Home Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-pink-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-gray-800 transition shadow-sm"
      >
        <Home size={16} /> Home
      </button>

      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-pink-100 dark:border-gray-800">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-pink-100 dark:bg-gray-800 rounded-full mb-4">
            <Lock className="w-6 h-6 text-pink-600 dark:text-pink-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-pink-50">Admin Access</h2>
        </div>

        {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-pink-500 dark:text-white outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-pink-500 dark:text-white outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 text-white font-medium rounded-lg transition-colors">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}