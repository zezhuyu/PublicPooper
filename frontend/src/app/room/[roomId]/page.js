'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FiMic, 
  FiMicOff, 
  FiVideo, 
  FiVideoOff, 
  FiMonitor, 
  FiSettings, 
  FiLogOut, 
  FiPhone, 
  FiPhoneCall,
  FiSend,
  FiCopy,
  FiHash,
  FiUsers,
  FiEdit3,
  FiAward,
  FiAlertCircle
} from 'react-icons/fi';
import { BsCircleFill } from 'react-icons/bs';
import { Frijole } from 'next/font/google';
import { useUser } from '../../../contexts/UserContext';
import apiService from '../../../services/api';

const frijole = Frijole({
  weight: '400',
  subsets: ['latin'],
});

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId;
  const { user, isLoggedIn } = useUser();
  const wsRef = useRef(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [message, setMessage] = useState('');
  const [roomDetails, setRoomDetails] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Competitive room state
  const getInitialTimer = (roomDetails) => {
    if (roomDetails?.type === 'competitive') {
      return 600; // 10 minutes for competitive rooms
    }
    // Check by room name for legacy support
    const roomName = roomDetails?.rname || roomId;
    switch(roomName) {
      case 'speed-poop-challenge': return 180; // 3 minutes
      case 'endurance-league': return 600;    // 10 minutes
      case 'technique-masters': return 300;   // 5 minutes
      default: return 300;
    }
  };
  
  const [timeRemaining, setTimeRemaining] = useState(300); // Default to 5 minutes
  const [playersRemaining, setPlayersRemaining] = useState(4);
  
  // Determine if competitive room based on room details
  const isCompetitiveRoom = roomDetails?.type === 'competitive' || 
                           ['speed-poop-challenge', 'endurance-league', 'technique-masters'].includes(roomDetails?.rname || roomId);

  // WebSocket connection and room initialization
  useEffect(() => {
    if (!isLoggedIn || !user) {
      router.push('/');
      return;
    }

    const initializeRoom = async () => {
      setIsConnecting(true);
      setApiError('');
      
      try {
        // First, get room details using roomId as the room ID
        const details = await apiService.getRoomDetails(roomId);
        if (details) {
          setRoomDetails(details);
          
          // Set timer based on room details
          setTimeRemaining(getInitialTimer(details));
          
          // Get connected users using the room ID
          const users = await apiService.getConnectedUsers(details.rid);
          setConnectedUsers(users);
          
          // Load chat history for the room
          try {
            const chatHistory = await apiService.getChatHistory(details.rid);
            if (chatHistory && chatHistory.length > 0) {
              // Transform backend chat messages to frontend format
              const formattedMessages = chatHistory.map((msg, index) => {
                const uid = msg.uid || msg.user_id || msg.userId || 'Anonymous';
                
                // Try to find user in connected users with comprehensive matching
                const foundUser = users.find(u => 
                  u.uid === uid || 
                  u.id === uid || 
                  u.user_id === uid ||
                  u.userId === uid
                );
                
                // Get user name with multiple fallback options
                const userName = foundUser?.name || 
                               foundUser?.username || 
                               foundUser?.uname ||
                               foundUser?.displayName ||
                               foundUser?.email ||
                               uid;
                               
                console.log('Chat history - UID:', uid, 'Found user:', foundUser, 'Resolved name:', userName);
                
                return {
                  id: msg.id || index + 1,
                  user: userName,
                  avatar: userName.charAt(0).toUpperCase(),
                  color: ['blue', 'green', 'purple', 'orange', 'red'][index % 5],
                  time: msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Recently',
                  content: msg.comment || msg.message || msg.content || ''
                };
              });
              setMessages(formattedMessages);
            } else {
              // Keep default welcome messages if no chat history
              setMessages([
                {
                  id: 1,
                  user: 'System',
                  avatar: 'S',
                  color: 'blue',
                  time: new Date().toLocaleString(),
                  content: `Welcome to ${details.rname || roomId}! 🚽`
                }
              ]);
            }
          } catch (chatError) {
            console.log('Could not load chat history:', chatError);
            // Keep default messages if chat history fails
          }
        } else {
          // If room doesn't exist, create fallback room details
          const fallbackDetails = {
            rid: roomId,
            rname: roomId,
            type: 'casual', // Default to casual since we don't know the type yet
            user_limit: 5
          };
          setRoomDetails(fallbackDetails);
          setTimeRemaining(getInitialTimer(fallbackDetails));
          
          // Set welcome message for new room
          setMessages([
            {
              id: 1,
              user: 'System',
              avatar: 'S',
              color: 'blue',
              time: new Date().toLocaleString(),
              content: `Welcome to ${roomId}! This room is being created. 🚽`
            }
          ]);
        }
        
        // Initialize WebSocket connection
        initWebSocket();
        
      } catch (error) {
        console.error('Failed to initialize room:', error);
        if (error.message.includes('CORS_ERROR')) {
          setApiError('Connection blocked by CORS policy. WebSocket and API features may be limited.');
        } else {
          setApiError(error.message);
        }
        
        // Continue in offline mode with mock data
        setRoomDetails({
          rid: roomId,
          rname: roomId,
          type: isCompetitiveRoom ? 'competitive' : 'casual',
          user_limit: 5
        });
      } finally {
        setIsConnecting(false);
      }
    };

    const initWebSocket = () => {
      try {
        wsRef.current = apiService.createWebSocket(roomId, user.uid);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected successfully');
          setApiError(''); // Clear any connection errors
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (parseError) {
            console.warn('Failed to parse WebSocket message:', parseError);
          }
        };
        
        wsRef.current.onclose = (event) => {
          console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
          // Only try to reconnect if it wasn't a deliberate close and user is still logged in
          if (event.code !== 1000 && isLoggedIn && user) {
            setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              initWebSocket();
            }, 3000);
          }
        };
        
        wsRef.current.onerror = (error) => {
          console.warn('WebSocket connection failed. Real-time features will be disabled.', error);
          // Don't set API error for WebSocket failures - this is not critical
          // Users can still use the app without real-time chat
        };
        
      } catch (error) {
        console.warn('Failed to create WebSocket connection:', error.message);
        // WebSocket failure is not critical - app should continue to work
      }
    };

    const handleWebSocketMessage = (data) => {
      switch (data.type) {
        case 'chat':
          // Try to get a readable name, with better fallback for UUIDs
          let userName = getUserName(data.uid);
          
          // If we still have a UUID, try to fetch user details asynchronously
          if (userName === data.uid && data.uid && data.uid.includes('-')) {
            fetchUserDetails(data.uid).then(userDetails => {
              if (userDetails && (userDetails.name || userDetails.username || userDetails.uname)) {
                // Update the message with the real name
                setMessages(prev => prev.map(msg => 
                  msg.id === Date.now() ? {
                    ...msg, 
                    user: userDetails.name || userDetails.username || userDetails.uname,
                    avatar: (userDetails.name || userDetails.username || userDetails.uname).charAt(0).toUpperCase()
                  } : msg
                ));
              }
            });
          }
          
          const newMessage = {
            id: Date.now(),
            user: userName,
            avatar: getUserAvatar(data.uid),
            color: ['blue', 'green', 'purple', 'orange', 'red'][Math.floor(Math.random() * 5)],
            time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: data.comment
          };
          setMessages(prev => [...prev, newMessage]);
          break;
        case 'user_joined':
          console.log('User joined:', data.user_id);
          refreshConnectedUsers();
          break;
        case 'user_left':
          console.log('User left:', data.user_id);
          refreshConnectedUsers();
          break;
        case 'error':
          setApiError(data.message);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    const refreshConnectedUsers = async () => {
      try {
        const roomRid = roomDetails?.rid || roomId;
        const users = await apiService.getConnectedUsers(roomRid);
        setConnectedUsers(users);
      } catch (error) {
        console.log('Failed to refresh connected users:', error);
      }
    };

    initializeRoom();

    // Set up periodic refresh of connected users (every 30 seconds)
    const userRefreshInterval = setInterval(() => {
      if (roomDetails?.rid) {
        refreshConnectedUsers();
      }
    }, 30000);

    // Cleanup WebSocket and interval on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(userRefreshInterval);
    };
  }, [isLoggedIn, user, roomId, isCompetitiveRoom, router]);

  // Timer effect for competitive rooms
  useEffect(() => {
    if (!isCompetitiveRoom) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isCompetitiveRoom]);

  // Player elimination effect for competitive rooms
  useEffect(() => {
    if (!isCompetitiveRoom || timeRemaining <= 0) return;
    
    const eliminationTimer = setInterval(() => {
      setPlayersRemaining(prev => {
        if (prev <= 1) return prev; // Keep at least 1 player
        // 20% chance of elimination every 30 seconds
        if (Math.random() < 0.2) {
          return prev - 1;
        }
        return prev;
      });
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(eliminationTimer);
  }, [isCompetitiveRoom, timeRemaining]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [messages, setMessages] = useState([]);
  const [userCache, setUserCache] = useState({}); // Cache for user details

  // Helper function to get user name from connected users or fallback to uid
  const getUserName = (uid) => {
    // Debug: log the data structures to understand the issue
    console.log('Getting user name for UID:', uid);
    console.log('Connected users:', connectedUsers);
    
    // Try different possible user ID fields and name fields
    const foundUser = connectedUsers.find(u => 
      u.uid === uid || 
      u.id === uid || 
      u.user_id === uid ||
      u.userId === uid
    );
    
    console.log('Found user:', foundUser);
    
    if (foundUser) {
      // Try different possible name fields
      const name = foundUser.name || foundUser.username || foundUser.uname || foundUser.displayName || foundUser.email;
      if (name && name !== uid) {
        console.log('Resolved name:', name);
        return name;
      }
    }
    
    // Check user cache for previously fetched user details
    if (userCache[uid]) {
      const cachedName = userCache[uid].name || userCache[uid].username || userCache[uid].uname;
      if (cachedName) {
        return cachedName;
      }
    }
    
    // If user not found in connected users, try to get from current user context if it's them
    if (user && (user.uid === uid || user.id === uid)) {
      const currentUserName = user.uname || user.name || user.username || user.email;
      if (currentUserName) {
        return currentUserName;
      }
    }
    
    // For now, return a simplified version of the UID for better readability
    // Extract first 8 characters if it's a long UUID
    if (uid && uid.length > 10 && uid.includes('-')) {
      return `User-${uid.substring(0, 8)}`;
    }
    
    // Final fallback
    return uid || 'Anonymous';
  };

  // Function to fetch and cache user details
  const fetchUserDetails = async (uid) => {
    if (userCache[uid]) return userCache[uid];
    
    try {
      const userDetails = await apiService.getUser(uid);
      setUserCache(prev => ({
        ...prev,
        [uid]: userDetails
      }));
      return userDetails;
    } catch (error) {
      console.log('Could not fetch user details for', uid, error);
      return null;
    }
  };

  // Helper function to get user avatar
  const getUserAvatar = (uid) => {
    const userName = getUserName(uid);
    return userName.charAt(0).toUpperCase();
  };

  // Message and room interaction functions
  const sendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      // Send via WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'chat',
          comment: message,
          targetUid: null
        }));
      } else {
        // Fallback to HTTP API
        const roomRid = roomDetails?.rid || roomId;
        await apiService.sendChatMessage(roomRid, user.uid, {
          comment: message,
          targetUid: null
        });
      }
      
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add message locally in offline mode
      const newMessage = {
        id: Date.now(),
        user: user?.uname || 'You',
        avatar: (user?.uname || 'You').charAt(0).toUpperCase(),
        color: 'indigo',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: message + ' (offline)'
      };
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      
      if (error.message.includes('CORS_ERROR')) {
        setApiError('Message sending blocked by CORS policy.');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const leaveRoom = async () => {
    try {
      if (roomDetails && user) {
        console.log('Attempting to leave room:', roomDetails.rid, 'user:', user.uid);
        await apiService.leaveRoom(roomDetails.rid, user.uid);
        console.log('Successfully left room via API');
      }
    } catch (error) {
      console.warn('Failed to leave room via API:', error.message);
      
      // Handle specific leave room errors gracefully
      if (error.message.includes('Resource not found')) {
        console.log('Leave room endpoint not found - this may be expected behavior');
      } else if (error.message.includes('CORS_ERROR')) {
        console.log('CORS error when leaving room - continuing with local cleanup');
      } else {
        console.log('Other error when leaving room:', error.message);
      }
      
      // Don't show error to user for leave operations - just continue
    } finally {
      // Always perform local cleanup regardless of API success/failure
      console.log('Performing local cleanup before leaving room');
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear any intervals or timers if needed
      // (The useEffect cleanup will handle this, but being explicit)
      
      // Navigate back to home
      router.push('/');
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    // You could add a toast notification here
  };

  return (
    <div className="flex h-screen bg-amber-50 text-gray-800">
      {/* Chat Panel */}
      <div className="w-80 bg-white flex flex-col border-r border-amber-200 shadow-lg">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-amber-200 bg-amber-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center text-amber-900">
              <FiHash className="text-amber-600 w-5 h-5" />
              <span className="ml-2">room-chat</span>
            </h2>
            <button
              onClick={copyRoomId}
              className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 px-2 py-1 rounded flex items-center gap-1 transition-colors"
              title="Copy Room ID"
            >
              <FiCopy className="w-3 h-3" />
              Copy Room ID
            </button>
          </div>
          <div className="text-xs text-amber-600 mt-1">Room ID: {roomId}</div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full bg-${msg.color}-500 flex items-center justify-center text-white text-sm font-semibold`}>
                {msg.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-amber-900">{msg.user}</span>
                  <span className="text-xs text-amber-600">{msg.time}</span>
                </div>
                <p className="text-gray-700 text-sm mt-1">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-amber-200 bg-amber-50">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Message #room-chat"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-amber-50 text-gray-800 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-amber-600 border border-amber-200"
            />
            <button
              onClick={sendMessage}
              className="p-2 text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-amber-200 px-4 py-3 border-b border-amber-300 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center gap-2 mr-4">
                <img 
                  src="/poop_king.png" 
                  alt="Poop King Crown" 
                  className="w-8 h-8 drop-shadow-sm"
                />
                <h3 className={`font-bold text-amber-900 text-xl ${frijole.className}`}>
                  PUBLICPOOPER
                </h3>
              </div>
              <span className="text-sm text-amber-700">
                Room: {roomDetails?.rname || roomId}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-amber-300 rounded-lg transition-colors text-amber-800" title="Call">
                <FiPhoneCall className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-amber-300 rounded-lg transition-colors text-amber-800" title="Video">
                <FiVideo className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-amber-300 rounded-lg transition-colors text-amber-800" title="Screen Share">
                <FiMonitor className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-amber-300 rounded-lg transition-colors text-amber-800" title="Settings">
                <FiSettings className="w-5 h-5" />
              </button>
              <button
                onClick={leaveRoom}
                className="p-2 hover:bg-red-300 bg-red-200 rounded-lg transition-colors text-red-800"
                title="Leave Room"
              >
                <FiLogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {apiError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 text-sm">{apiError}</p>
                {apiError.includes('CORS') && (
                  <p className="text-red-600 text-xs mt-1">
                    Backend server may not have CORS enabled. Some features may be limited.
                  </p>
                )}
              </div>
              <button
                onClick={() => setApiError('')}
                className="text-red-600 hover:text-red-800 transition-colors"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {isConnecting && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-blue-800 text-sm">Connecting to room...</span>
            </div>
          </div>
        )}

        {/* Competitive Room Stats */}
        {isCompetitiveRoom && (
          <div className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200 p-4">
            <div className="flex justify-center space-x-8">
              {/* Timer */}
              <div className="flex items-center space-x-3">
                <div className="bg-amber-600 text-white p-3 rounded-full shadow-md">
                  <FiEdit3 className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-amber-700">Time Remaining</div>
                  <div className={`text-3xl font-bold ${timeRemaining <= 60 ? 'text-red-600' : 'text-amber-900'}`}>
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>
              
              {/* Players Connected */}
              <div className="flex items-center space-x-3">
                <div className="bg-green-600 text-white p-3 rounded-full shadow-md">
                  <FiUsers className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-amber-700">Players Connected</div>
                  <div className="text-3xl font-bold text-amber-900">
                    {connectedUsers.length || playersRemaining}
                  </div>
                </div>
              </div>
              
              {/* Competition Status */}
              <div className="flex items-center space-x-3">
                <div className="bg-orange-600 text-white p-3 rounded-full shadow-md">
                  <FiAward className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-amber-700">Competition</div>
                  <div className="text-xl font-bold text-orange-600">
                    {timeRemaining > 0 ? 'IN PROGRESS' : 'FINISHED'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {connectedUsers.length > 0 ? (
              connectedUsers.map((userObj, index) => {
                const uid = userObj.uid || userObj.id || userObj.user_id || `user-${index}`;
                const userName = getUserName(uid);
                
                return (
                  <div
                    key={uid}
                    className="relative bg-amber-100 border-2 border-amber-200 rounded-lg overflow-hidden flex items-center justify-center"
                  >
                    {/* Video Content */}
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🚽
                    </div>

                    {/* Participant Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{userName}</span>
                        <div className="flex items-center space-x-2">
                          <BsCircleFill className="w-2 h-2 text-green-500" />
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70 transition-opacity">
                        <FiMic className="w-4 h-4" />
                      </button>
                      <button className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70 transition-opacity">
                        <FiVideo className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              // Show empty state when no users are connected
              <div className="col-span-2 flex items-center justify-center text-amber-600 text-lg min-h-[300px]">
                <div className="text-center">
                  <FiUsers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No users connected</p>
                  <p className="text-sm opacity-70">Waiting for participants to join...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="bg-amber-200 p-4 border-t border-amber-300">
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <FiMicOff className="w-5 h-5" /> : <FiMic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <FiVideoOff className="w-5 h-5" /> : <FiVideo className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-3 rounded-full transition-colors ${isScreenSharing ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <FiMonitor className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors" title="Settings">
              <FiSettings className="w-5 h-5" />
            </button>
            <button
              onClick={leaveRoom}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
              title="Leave call"
            >
              <FiPhone className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
