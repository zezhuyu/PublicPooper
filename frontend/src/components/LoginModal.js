'use client';
import { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { FiUser, FiMail, FiStar } from 'react-icons/fi';
import { Frijole } from 'next/font/google';

const frijole = Frijole({
  weight: '400',
  subsets: ['latin'],
});

export default function LoginModal({ onClose }) {
  const { loginUser, loginByUsername } = useUser();
  const [mode, setMode] = useState('login'); // 'login' or 'create'
  const [formData, setFormData] = useState({
    uname: '',
    email: '',
    type: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        // Login by username
        if (!formData.uname) {
          setError('Please enter your username to login.');
          return;
        }
        await loginByUsername(formData.uname);
      } else {
        // Create new user
        if (!formData.uname || !formData.email) {
          setError('Please fill in all required fields.');
          return;
        }
        await loginUser(formData);
      }
      onClose();
    } catch (err) {
      console.error('Login/Create user error:', err);
      
      if (err.message.includes('BACKEND_ERROR') || err.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please ensure the backend is running with HTTPS support.');
      } else if (err.message.includes('CORS_ERROR')) {
        setError('Server connection blocked. Please check server configuration.');
      } else if (err.message.includes('USER_NOT_FOUND')) {
        setError('No user found with this username. Please create a new account or check your username.');
      } else if (err.message.includes('USER_EXISTS')) {
        setError('A user with this username already exists. Since we cannot retrieve existing users, please create a new account with a different username or contact support.');
      } else if (mode === 'login') {
        setError('Login failed. Please try creating a new account.');
      } else {
        setError('Failed to create user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(''); // Clear any errors
    // Keep email but clear other fields when switching modes
    setFormData({
      uname: '',
      email: formData.email,
      type: 'normal'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <img 
            src="/poop_king.png" 
            alt="Poop King Crown" 
            className="w-16 h-16 mx-auto mb-4 drop-shadow-md"
          />
          <h2 className={`text-3xl font-bold text-amber-900 ${frijole.className}`}>
            {mode === 'login' ? 'Welcome Back!' : 'Join PUBLICPOOPER'}
          </h2>
          <p className="text-amber-700 mt-2">
            {mode === 'login' 
              ? 'Login with your email address' 
              : 'Create your account to start competing!'
            }
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex mb-6 bg-amber-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => handleModeChange('login')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              mode === 'login'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('create')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              mode === 'create'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field - always show */}
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              <FiUser className="inline w-4 h-4 mr-2" />
              Username
            </label>
            <input
              type="text"
              name="uname"
              value={formData.uname}
              onChange={handleInputChange}
              required
              className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
              placeholder={mode === 'login' ? 'Enter your username to login' : 'Choose a username'}
            />
          </div>

          {/* Email field - always show */}
          {/* Email - only show for create mode */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">
                <FiMail className="inline w-4 h-4 mr-2" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
                placeholder="Enter your email"
              />
            </div>
          )}

          {/* Account type - only show for create mode */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-2">
                <FiStar className="inline w-4 h-4 mr-2" />
                Account Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
              >
                <option value="normal">Normal User (Free)</option>
                <option value="premium">Premium User (All Features)</option>
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
              <div className="font-medium mb-1">{error}</div>
              {error.includes('Cannot connect to server') && (
                <div className="text-sm mt-2 space-y-1">
                  <div className="font-medium">Development Setup Required:</div>
                  <div>• Backend server must run with HTTPS/SSL</div>
                  <div>• Check that server is running on http://air.local:8000</div>
                  <div>• Verify SSL certificate is valid or accepted</div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold py-3 rounded-lg transition-colors shadow-md"
            >
              {loading 
                ? (mode === 'login' ? 'Logging in...' : 'Creating...') 
                : (mode === 'login' ? 'Login' : 'Join Now')
              }
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-amber-600">
          {mode === 'login' ? (
            <p>Don't have an account? Click "Create Account" above!</p>
          ) : (
            <p>Premium users can upload custom emojis and use premium features!</p>
          )}
        </div>
      </div>
    </div>
  );
}
