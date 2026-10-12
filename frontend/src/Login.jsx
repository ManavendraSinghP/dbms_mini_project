import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Define the API URL with a local fallback for deployment compatibility
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-pink-100 dark:border-gray-800">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-pink-100 dark:bg-gray-800 rounded-full mb-4">
            <Lock className="w-6 h-6 text-pink-6