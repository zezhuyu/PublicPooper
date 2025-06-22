'use client';
import { useState, useEffect } from 'react';
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
  FiAward
} from 'react-icons/fi';
import { BsCircleFill } from 'react-icons/bs';
import { Frijole } from 'next/font/google';

const frijole = Frijole({
  weight: '400',
  subsets: ['latin'],
});

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId;
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [message, setMessage] = useState('');
  
  // Competitive room state
  const getInitialTimer = (roomId) => {
    switch(roomId) {
      case 'speed-poop-challenge': return 180; // 3 minutes
      case 'endurance-league': return 600;    // 10 minutes
      case 'technique-masters': return 300;   // 5 minutes
      default: return 300;
    }
  };
  
  const [timeRemaining, setTimeRemaining] = useState(getInitialTimer(roomId));
  const [playersRemaining, setPlayersRemaining] = useState(4);
  
  // Define competitive room IDs
  const competitiveRoomIds = ['speed-poop-challenge', 'endurance-league', 'technique-masters'];
  const isCompetitiveRoom = competitiveRoomIds.includes(roomId);
  
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
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'Nelly',
      avatar: 'N',
      color: 'blue',
      time: 'Today at 2:15 PM',
      content: 'Hey everyone! Ready for some competitive pooping? 💩'
    },
    {
      id: 2,
      user: "Clyde's Cousin",
      avatar: 'C',
      color: 'green',
      time: 'Today at 2:16 PM',
      content: "Absolutely! I've been holding it in all day for this! 🚽"
    },
    {
      id: 3,
      user: 'Wumpus',
      avatar: 'W',
      color: 'purple',
      time: 'Today at 2:17 PM',
      content: 'Can everyone see my bathroom setup? Testing the video connection...'
    },
    {
      id: 4,
      user: "Clyde's Friend",
      avatar: 'F',
      color: 'orange',
      time: 'Today at 2:18 PM',
      content: 'Yes! Looking good. Love the synchronized pooping features!'
    },
    {
      id: 5,
      user: 'MeHi',
      avatar: 'M',
      color: 'red',
      time: 'Today at 2:19 PM',
      content: 'This is amazing! Real-time poop competition while video chatting 🚀'
    }
  ]);

  const videoParticipants = [
    { name: "Clyde's Cousin", isPooping: true, content: '🚽 Pooping...' },
    { name: "Clyde's Friend", isPooping: false, content: '🎵' },
    { name: 'Wumpus', isPooping: true, content: '� In progress...' },
    { name: 'Nelly', isPooping: false, content: '😺', isLive: true },
  ];

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        user: 'You',
        avatar: 'Y',
        color: 'indigo',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: message
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const leaveRoom = () => {
    router.push('/');
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
              {roomId.slice(0, 8)}...
            </button>
          </div>
          <div className="text-xs text-amber-600 mt-1">Room ID: {roomId}</div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 bg-${msg.color}-500 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-semibold text-white">{msg.avatar}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium text-${msg.color}-600`}>{msg.user}</span>
                    <span className="text-xs text-amber-600">{msg.time}</span>
                  </div>
                  <p className="text-gray-700 mt-1">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Chat Input */}
        <div className="p-4 border-t border-amber-200">
          <div className="flex items-center space-x-2">
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
              <span className="text-sm text-amber-700">Room: {roomId}</span>
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
                className="p-2 hover:bg-red-600 bg-red-500 rounded-lg text-white transition-colors shadow-md"
                title="Leave Room"
              >
                <FiLogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Competitive Room Timer & Stats */}
        {isCompetitiveRoom && (
          <div className="bg-amber-100 border-b border-amber-300 px-6 py-4">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
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
              
              {/* Players Remaining */}
              <div className="flex items-center space-x-3">
                <div className="bg-green-600 text-white p-3 rounded-full shadow-md">
                  <FiUsers className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-amber-700">Players Remaining</div>
                  <div className="text-3xl font-bold text-amber-900">
                    {playersRemaining}
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
            {videoParticipants.map((participant, index) => (
              <div
                key={participant.name}
                className="relative bg-amber-100 border-2 border-amber-200 rounded-lg overflow-hidden flex items-center justify-center"
              >
                {/* Video Content */}
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  {participant.content}
                </div>
                
                {/* User Info Overlay */}
                <div className="absolute bottom-2 left-2 bg-amber-800 bg-opacity-80 px-2 py-1 rounded text-sm text-white">
                  {participant.name}
                  {participant.isLive && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <BsCircleFill className="w-2 h-2" />
                      LIVE
                    </span>
                  )}
                </div>

                {/* Pooping Indicator */}
                {participant.isPooping && (
                  <div className="absolute top-2 right-2 bg-amber-600 p-2 rounded flex items-center justify-center">
                    <FiEdit3 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main Screen Share Area */}
          <div className="mt-4 bg-amber-100 border-2 border-amber-300 rounded-lg p-4 text-center">
            <div className="bg-white text-amber-900 p-8 rounded inline-block border border-amber-200 shadow-lg">
              <div className="text-6xl mb-4">🚽</div>
              <div className="text-xl font-semibold">Nelly's Toilet Stream</div>
              <div className="text-red-500 font-bold flex items-center justify-center gap-2">
                <BsCircleFill className="w-3 h-3" />
                LIVE
              </div>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="bg-amber-200 border-t border-amber-300 px-4 py-3 flex items-center justify-center space-x-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full text-white transition-colors ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-600 hover:bg-amber-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <FiMicOff className="w-5 h-5" /> : <FiMic className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-full text-white transition-colors ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-600 hover:bg-amber-700'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? <FiVideoOff className="w-5 h-5" /> : <FiVideo className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-3 rounded-full text-white transition-colors ${
              isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-600 hover:bg-amber-700'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <FiMonitor className="w-5 h-5" />
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
  );
}
