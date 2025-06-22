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
  FiEdit3
} from 'react-icons/fi';
import { BsCircleFill } from 'react-icons/bs';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId;
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [message, setMessage] = useState('');
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
    <div className="flex h-screen bg-gray-800 text-white">
      {/* Chat Panel */}
      <div className="w-80 bg-gray-900 flex flex-col">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center">
              <FiHash className="text-gray-400 w-5 h-5" />
              <span className="ml-2">room-chat</span>
            </h2>
            <button
              onClick={copyRoomId}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded flex items-center gap-1"
              title="Copy Room ID"
            >
              <FiCopy className="w-3 h-3" />
              {roomId.slice(0, 8)}...
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-1">Room ID: {roomId}</div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 bg-${msg.color}-500 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-semibold">{msg.avatar}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium text-${msg.color}-300`}>{msg.user}</span>
                    <span className="text-xs text-gray-400">{msg.time}</span>
                  </div>
                  <p className="text-gray-300 mt-1">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Chat Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Message #room-chat"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
            <button
              onClick={sendMessage}
              className="p-2 text-gray-400 hover:text-white"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiUsers className="mr-2 w-5 h-5 text-green-400" />
              <h3 className="font-semibold">Poop and Chat Room</h3>
              <span className="ml-2 text-sm text-gray-400">({roomId})</span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-600 rounded" title="Call">
                <FiPhoneCall className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-600 rounded" title="Video">
                <FiVideo className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-600 rounded" title="Screen Share">
                <FiMonitor className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-600 rounded" title="Settings">
                <FiSettings className="w-5 h-5" />
              </button>
              <button
                onClick={leaveRoom}
                className="p-2 hover:bg-red-600 bg-red-500 rounded text-white"
                title="Leave Room"
              >
                <FiLogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {videoParticipants.map((participant, index) => (
              <div
                key={participant.name}
                className="relative bg-gray-600 rounded-lg overflow-hidden flex items-center justify-center"
              >
                {/* Video Content */}
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  {participant.content}
                </div>
                
                {/* User Info Overlay */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
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
                  <div className="absolute top-2 right-2 bg-brown-500 p-2 rounded flex items-center justify-center">
                    <FiEdit3 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main Screen Share Area */}
          <div className="mt-4 bg-gray-700 rounded-lg p-4 text-center">
            <div className="bg-white text-black p-8 rounded inline-block">
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
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-center space-x-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full ${
              isMuted ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <FiMicOff className="w-5 h-5" /> : <FiMic className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-full ${
              isVideoOff ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? <FiVideoOff className="w-5 h-5" /> : <FiVideo className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-3 rounded-full ${
              isScreenSharing ? 'bg-green-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <FiMonitor className="w-5 h-5" />
          </button>
          
          <button
            onClick={leaveRoom}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600"
            title="Leave call"
          >
            <FiPhone className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
