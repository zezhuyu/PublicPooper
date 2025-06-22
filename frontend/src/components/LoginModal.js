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
  const { loginUser } = useUser();
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
      await loginUser(formData);
      onClose();
    } catch (err) {
      setError('Failed to create user. Please try again.');
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
            Join PUBLICPOOPER
          </h2>
          <p className="text-amber-700 mt-2">Create your account to start competing!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter your username"
            />
          </div>

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

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
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
              {loading ? 'Creating...' : 'Join Now'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-amber-600">
          <p>Premium users can upload custom emojis and use premium features!</p>
        </div>
      </div>
    </div>
  );
}
