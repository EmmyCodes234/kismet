import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          }
        }
      });

      if (error) throw error;
      
      // The user is signed up and logged in automatically.
      // Now, let's create their profile.
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            display_name: displayName,
            email: data.user.email,
          });
        if (profileError) throw profileError;
      }
      
      navigate('/dashboard');

    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-wider">Kismet</h1>
          <p className="mt-2 text-sm text-gray-400">Create your Tournament Director account</p>
        </div>
        {error && <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm" role="alert">{error}</div>}
        <form className="space-y-4" onSubmit={handleSignUp}>
          <div>
            <label htmlFor="displayName" className="text-sm font-bold text-gray-400 block mb-2">
              Full Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 text-gray-100 bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
              placeholder="e.g., Jane Doe"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-bold text-gray-400 block mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 text-gray-100 bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password"  className="text-sm font-bold text-gray-400 block mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 text-gray-100 bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cool-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-cool-blue-600 hover:bg-cool-blue-700 rounded-md text-white font-bold text-center transition duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-cool-blue-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;