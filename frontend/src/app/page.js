'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiUsers, FiHome, FiEdit3, FiZap, FiAward, FiMessageCircle, FiBookOpen, FiLogOut } from 'react-icons/fi';
import { BsCircleFill } from 'react-icons/bs';
import { Frijole } from 'next/font/google';
import { useUser } from '../contexts/UserContext';
import LoginModal from '../components/LoginModal';
import apiService from '../services/api';

const frijole = Frijole({
  weight: '400',
  subsets: ['latin'],
});

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('COMPETITIVE');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [roomUsers, setRoomUsers] = useState({});
  const [apiError, setApiError] = useState('');
  const [actualRooms, setActualRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, isLoggedIn, logoutUser } = useUser();

  const joinRoom = async (roomName) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setIsJoining(true);
    setApiError('');
    
    try {
      // Determine room type based on category or room name
      const roomType = selectedCategory === 'COMPETITIVE' || 
                      ['speed-poop-challenge', 'endurance-league', 'technique-masters'].includes(roomName) 
                      ? 'competitive' : 'casual';
      const duration = roomType === 'competitive' ? 600.0 : 300.0;
      
      const roomData = {
        rname: roomName,
        user_limit: 5,
        type: roomType,
        duration: duration
      };

      console.log('Attempting to join room:', roomName, 'with data:', roomData);
      
      // First, check if this room already exists by searching through existing rooms
      let roomIdToJoin = roomName; // Default to using room name as ID
      
      try {
        const existingRooms = await apiService.getAllRooms();
        const existingRoom = existingRooms.find(room => room.rname === roomName);
        if (existingRoom) {
          roomIdToJoin = existingRoom.rid; // Use the actual room ID
          router.push(`/room/${roomIdToJoin}`);
          return;
        }
      } catch (error) {
        console.log('Could not fetch existing rooms, will try to create new room:', error);
      }
      
      // Room doesn't exist, create it by joining with room name
      // Backend should return the new room ID
      const joinResponse = await apiService.joinRoom(roomName, user.uid, roomData);
      
      // If backend returns a room ID, use that for navigation
      const newRoomId = joinResponse?.rid || joinResponse?.room_id || roomIdToJoin;
      router.push(`/room/${newRoomId}`);
    } catch (error) {
      console.error('Failed to join room:', error);
      setApiError(error.message);
      setIsJoining(false);
      
      // Handle specific CORS errors
      if (error.message.includes('CORS_ERROR')) {
        console.log('CORS error detected, providing user guidance');
        setApiError('Connection blocked by CORS policy. Please ensure the backend server at http://air.local:8000 is running and has CORS enabled.');
        return;
      }
      
      // Handle room not found error - this might happen if the backend doesn't auto-create rooms
      if (error.message.includes('Resource not found') && error.message.includes('/rooms/')) {
        console.log('Room not found, this might be expected for new rooms');
        setApiError(`Room "${roomName}" could not be created or joined. The backend may need to support room creation.`);
        return;
      }
      
      // If API is not available, allow offline mode
      if (error.message.includes('Cannot connect to API server')) {
        console.log('API not available, entering offline mode');
        router.push(`/room/${roomName}`);
      }
    }
  };

  const createNewRoom = async () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    const newRoomId = `${selectedCategory.toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`;
    await joinRoom(newRoomId);
  };

  // Fetch actual rooms from backend and suggested room user counts
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const fetchRoomData = async () => {
      setIsLoading(true);
      setApiError('');
      
      try {
        // First, get all existing rooms from the backend
        const existingRooms = await apiService.getAllRooms();
        setActualRooms(existingRooms || []);
        
        // Define suggested room names
        const suggestedRoomNames = [
          'speed-poop-challenge',
          'endurance-league', 
          'technique-masters',
          'casual-chatters',
          'morning-routine',
          'late-night-sessions'
        ];
        
        const userCounts = {};
        
        // Only fetch user counts for rooms that actually exist
        for (const room of existingRooms || []) {
          if (suggestedRoomNames.includes(room.rname)) {
            try {
              const connectedUsers = await apiService.getConnectedUsers(room.rid);
              userCounts[room.rname] = connectedUsers.length;
            } catch (error) {
              console.log(`Error fetching users for ${room.rname}:`, error);
              userCounts[room.rname] = 0;
            }
          }
        }
        
        // Set user counts for suggested rooms (0 for non-existent rooms)
        for (const roomName of suggestedRoomNames) {
          if (!(roomName in userCounts)) {
            userCounts[roomName] = 0;
          }
        }
        
        setRoomUsers(userCounts);
      } catch (error) {
        console.error('Failed to fetch room data:', error);
        setApiError(`Failed to load rooms: ${error.message}`);
        
        // Fallback: just set all suggested rooms to 0 users
        const suggestedRoomNames = [
          'speed-poop-challenge',
          'endurance-league', 
          'technique-masters',
          'casual-chatters',
          'morning-routine',
          'late-night-sessions'
        ];
        
        const fallbackUserCounts = {};
        suggestedRoomNames.forEach(name => {
          fallbackUserCounts[name] = 0;
        });
        setRoomUsers(fallbackUserCounts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchRoomData, 30000);
    
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Static suggested rooms (since backend creates rooms dynamically)
  const suggestedRooms = {
    COMPETITIVE: [
      {
        id: 'speed-poop-challenge',
        name: 'Speed Poop Challenge',
        description: 'Race against time and competitors',
        icon: FiZap,
        color: 'text-yellow-400',
        type: 'competitive'
      },
      {
        id: 'endurance-league',
        name: 'Endurance League', 
        description: 'Who can last the longest?',
        icon: FiAward,
        color: 'text-orange-400',
        type: 'competitive'
      },
      {
        id: 'technique-masters',
        name: 'Technique Masters',
        description: 'Show off your skills',
        icon: FiUsers,
        color: 'text-purple-400',
        type: 'competitive'
      }
    ],
    SOCIAL: [
      {
        id: 'casual-chatters',
        name: 'Casual Chatters',
        description: 'Relaxed pooping and conversation',
        icon: FiMessageCircle,
        color: 'text-blue-400',
        type: 'casual'
      },
      {
        id: 'morning-routine',
        name: 'Morning Routine',
        description: 'Start your day together',
        icon: FiHome,
        color: 'text-green-400',
        type: 'casual'
      },
      {
        id: 'late-night-sessions',
        name: 'Late Night Sessions',
        description: 'Night owls unite',
        icon: FiUsers,
        color: 'text-indigo-400',
        type: 'casual'
      }
    ],
    'TIPS/TRICKS': [
      {
        id: 'beginner-guide',
        name: 'Beginner Guide',
        description: 'Learn the basics',
        icon: FiBookOpen,
        color: 'text-cyan-400',
        type: 'casual'
      },
      {
        id: 'pro-techniques',
        name: 'Pro Techniques',
        description: 'Advanced strategies',
        icon: FiEdit3,
        color: 'text-pink-400',
        type: 'casual'
      },
      {
        id: 'health-wellness',
        name: 'Health & Wellness',
        description: 'Stay healthy while competing',
        icon: FiZap,
        color: 'text-red-400',
        type: 'casual'
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

            {/* Center Navigation */}
            <div className="flex gap-2">
              {Object.keys(suggestedRooms).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-1.5 text-xs font-bold border-2 transition-all duration-200 rounded-md shadow-sm ${frijole.className} ${
                    selectedCategory === category
                      ? 'bg-amber-700 text-white border-amber-700 shadow-md transform scale-105'
                      : 'bg-white text-amber-800 border-amber-600 hover:bg-amber-100 hover:shadow-md'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {/* User Section */}
            <div className="flex items-center gap-1">
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-900">{user.uname}</div>
                    <div className="text-xs text-amber-700">
                      {user.type === 'premium' ? '👑 Premium' : 'Normal'}
                    </div>
                  </div>
                  <button
                    onClick={logoutUser}
                    className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors shadow-sm"
                    title="Logout"
                  >
                    <FiLogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md font-semibold text-xs transition-colors shadow-sm"
                >
                  Join Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API Error Display */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 rounded-full p-2">
              <FiZap className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 mb-2">Connection Issue</h4>
              <p className="text-red-700 text-sm mb-3">{apiError}</p>
              {apiError.includes('CORS') && (
                <div className="bg-red-100 p-3 rounded-lg border border-red-200">
                  <p className="text-red-800 text-xs font-semibold mb-2">To fix this CORS issue:</p>
                  <ul className="text-red-700 text-xs space-y-1">
                    <li>1. Ensure the backend server is running at http://air.local:8000</li>
                    <li>2. The server must have CORS headers configured (Access-Control-Allow-Origin)</li>
                    <li>3. Check that the server allows requests from this domain</li>
                  </ul>
                </div>
              )}
              <button
                onClick={() => setApiError('')}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 text-amber-900 ${frijole.className}`}>{selectedCategory} ROOMS</h2>
          <p className="text-amber-700">Join other poopers in {selectedCategory.toLowerCase()} activities</p>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            // Loading state
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-amber-700">Loading rooms...</span>
              </div>
            </div>
          ) : actualRooms.length > 0 ? (
            // Display actual rooms from backend
            actualRooms
              .filter(room => {
                // Filter rooms by selected category
                if (selectedCategory === 'COMPETITIVE') {
                  return room.type === 'competitive';
                } else if (selectedCategory === 'SOCIAL') {
                  return room.type === 'casual';
                } else {
                  return true; // Show all for TIPS/TRICKS or other categories
                }
              })
              .map((room) => {
                const roomId = room.rid || room.rname;
                const IconComponent = room.type === 'competitive' ? FiZap : FiMessageCircle;
                const iconColor = room.type === 'competitive' ? 'text-yellow-400' : 'text-blue-400';
                
                return (
                  <div
                    key={roomId}
                    className="bg-white rounded-xl p-6 hover:bg-amber-50 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl border border-amber-200 hover:border-amber-300"
                    onClick={() => joinRoom(room.rname)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <IconComponent className={`w-6 h-6 ${iconColor}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{room.rname}</h3>
                          <p className="text-amber-600 text-sm">
                            {room.type === 'competitive' ? 'Competitive room' : 'Casual chatting'}
                          </p>
                        </div>
                      </div>
                      {room.type === 'competitive' && (
                        <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs font-semibold">
                          COMPETITIVE
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <BsCircleFill className="w-2 h-2" />
                        {roomUsers[roomId] || 0} online
                      </div>
                      <button 
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md hover:shadow-lg ${
                          isLoggedIn 
                            ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        }`}
                        disabled={!isLoggedIn}
                        onClick={(e) => {
                          e.stopPropagation();
                          isLoggedIn && joinRoom(room.rname);
                        }}
                      >
                        {isLoggedIn ? 'Join Room' : 'Login First'}
                      </button>
                    </div>
                  </div>
                );
              })
          ) : (
            // No rooms available - show message
            <div className="col-span-full text-center py-12">
              <div className="max-w-md mx-auto">
                <FiUsers className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-amber-900 mb-2">No rooms available</h3>
                <p className="text-amber-700 mb-4">
                  {selectedCategory === 'COMPETITIVE' 
                    ? 'No competitive rooms are currently active.' 
                    : selectedCategory === 'SOCIAL'
                    ? 'No social rooms are currently active.'
                    : 'No rooms are currently available.'}
                </p>
                <p className="text-amber-600 text-sm">Create a new room below to get started!</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Join Section */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-amber-200">
          <h3 className="text-xl font-bold mb-4 text-amber-900">Quick Join or Create Room</h3>
          {isLoggedIn ? (
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
          ) : (
            <div className="text-center py-8">
              <p className="text-amber-700 mb-4">Please log in to join or create rooms</p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Create Account
              </button>
            </div>
          )}
        </div>

        {/* Error Display Section */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 rounded-full p-2">
                <FiZap className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 mb-2">Connection Issue</h4>
                <p className="text-red-700 text-sm mb-3">{apiError}</p>
                {apiError.includes('CORS') && (
                  <div className="bg-red-100 p-3 rounded-lg border border-red-200">
                    <p className="text-red-800 text-xs font-semibold mb-2">To fix this CORS issue:</p>
                    <ul className="text-red-700 text-xs space-y-1">
                      <li>1. Ensure the backend server is running at http://air.local:8000</li>
                      <li>2. The server must have CORS headers configured (Access-Control-Allow-Origin)</li>
                      <li>3. Check that the server allows requests from this domain</li>
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => setApiError('')}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
}
