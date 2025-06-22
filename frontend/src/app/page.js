'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiUsers, FiHome, FiEdit3, FiZap, FiAward, FiMessageCircle, FiBookOpen } from 'react-icons/fi';
import { BsCircleFill } from 'react-icons/bs';
import { Frijole } from 'next/font/google';

const frijole = Frijole({
  weight: '400',
  subsets: ['latin'],
});

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('COMPETITIVE');
  const router = useRouter();

  const joinRoom = (id) => {
    setIsJoining(true);
    // Simulate joining a room
    setTimeout(() => {
      router.push(`/room/${id}`);
    }, 1000);
  };

  const createNewRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 15);
    joinRoom(newRoomId);
  };

  const categories = {
    COMPETITIVE: [
      {
        name: 'Speed Poop Challenge',
        id: 'speed-poop-challenge',
        description: 'Race against time and competitors',
        users: 12,
        icon: FiZap,
        color: 'text-yellow-400'
      },
      {
        name: 'Endurance League',
        id: 'endurance-league',
        description: 'Who can last the longest?',
        users: 8,
        icon: FiAward,
        color: 'text-orange-400'
      },
      {
        name: 'Technique Masters',
        id: 'technique-masters',
        description: 'Show off your skills',
        users: 5,
        icon: FiUsers,
        color: 'text-purple-400'
      }
    ],
    SOCIAL: [
      {
        name: 'Casual Chatters',
        id: 'casual-chatters',
        description: 'Relaxed pooping and conversation',
        users: 15,
        icon: FiMessageCircle,
        color: 'text-blue-400'
      },
      {
        name: 'Morning Routine',
        id: 'morning-routine',
        description: 'Start your day together',
        users: 7,
        icon: FiHome,
        color: 'text-green-400'
      },
      {
        name: 'Late Night Sessions',
        id: 'late-night-sessions',
        description: 'Night owls unite',
        users: 3,
        icon: FiUsers,
        color: 'text-indigo-400'
      }
    ],
    'TIPS/TRICKS': [
      {
        name: 'Beginner Guide',
        id: 'beginner-guide',
        description: 'Learn the basics',
        users: 9,
        icon: FiBookOpen,
        color: 'text-cyan-400'
      },
      {
        name: 'Pro Techniques',
        id: 'pro-techniques',
        description: 'Advanced strategies',
        users: 6,
        icon: FiEdit3,
        color: 'text-pink-400'
      },
      {
        name: 'Health & Wellness',
        id: 'health-wellness',
        description: 'Stay healthy while competing',
        users: 4,
        icon: FiZap,
        color: 'text-red-400'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-amber-50 text-gray-800">
      {/* Header */}
      <div className="bg-amber-200 border-b-4 border-amber-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/poop_king.png" 
                alt="Poop King Crown" 
                className="w-12 h-12 drop-shadow-md"
              />
              <h1 className={`text-4xl font-bold text-amber-900 ${frijole.className} drop-shadow-sm`}>
                PUBLICPOOPER
              </h1>
            </div>
            
            {/* Navigation */}
            <div className="flex gap-2">
              {Object.keys(categories).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-2 font-bold border-2 transition-all duration-200 rounded-lg shadow-md ${
                    selectedCategory === category
                      ? 'bg-amber-700 text-white border-amber-700 shadow-lg transform scale-105'
                      : 'bg-white text-amber-800 border-amber-600 hover:bg-amber-100 hover:shadow-lg'
                  }`}
                  style={{fontFamily: 'Impact, Arial Black, sans-serif'}}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 text-amber-900">{selectedCategory} ROOMS</h2>
          <p className="text-amber-700">Join other poopers in {selectedCategory.toLowerCase()} activities</p>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {categories[selectedCategory].map((room) => {
            const IconComponent = room.icon;
            return (
              <div
                key={room.id}
                className="bg-white rounded-xl p-6 hover:bg-amber-50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl border border-amber-200 hover:border-amber-300"
                onClick={() => joinRoom(room.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <IconComponent className={`w-6 h-6 ${room.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{room.name}</h3>
                      <p className="text-amber-600 text-sm">{room.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <BsCircleFill className="w-2 h-2" />
                    {room.users} online
                  </div>
                  <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md hover:shadow-lg">
                    Join Room
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Join Section */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-amber-200">
          <h3 className="text-xl font-bold mb-4 text-amber-900">Quick Join or Create Room</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex-1 bg-amber-50 text-gray-800 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-amber-600 border border-amber-200"
            />
            <button
              onClick={() => joinRoom(roomId)}
              disabled={!roomId.trim() || isJoining}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <FiUsers className="w-5 h-5" />
              {isJoining ? 'Joining...' : 'Join'}
            </button>
            <button
              onClick={createNewRoom}
              disabled={isJoining}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <FiPlus className="w-5 h-5" />
              {isJoining ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
