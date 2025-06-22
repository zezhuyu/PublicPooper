'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
      content: 'Hey everyone! Ready to start drawing?'
    },
    {
      id: 2,
      user: "Clyde's Cousin",
      avatar: 'C',
      color: 'green',
      time: 'Today at 2:16 PM',
      content: "Absolutely! I've got my tablet ready 🎨"
    },
    {
      id: 3,
      user: 'Wumpus',
      avatar: 'W',
      color: 'purple',
      time: 'Today at 2:17 PM',
      content: 'Can we all see the shared canvas? Testing the connection...'
    },
    {
      id: 4,
      user: "Clyde's Friend",
      avatar: 'F',
      color: 'orange',
      time: 'Today at 2:18 PM',
      content: 'Yes! Looking good. Love the collaborative features!'
    },
    {
      id: 5,
      user: 'MeHi',
      avatar: 'M',
      color: 'red',
      time: 'Today at 2:19 PM',
      content: 'This is amazing! Real-time collaboration while video chatting 🚀'
    }
  ]);

  const videoParticipants = [
    { name: "Clyde's Cousin", isDrawing: true, content: '🎨 Drawing...' },
    { name: "Clyde's Friend", isDrawing: false, content: '🎵' },
    { name: 'Wumpus', isDrawing: true, content: '🖼️ Art in progress...' },
    { name: 'Nelly', isDrawing: false, content: '😺', isLive: true },
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
              <span className="text-gray-400">#</span>
              <span className="ml-2">room-chat</span>
            </h2>
            <button
              onClick={copyRoomId}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
              title="Copy Room ID"
            >
              📋 {roomId.slice(0, 8)}...
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
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
              <span className="mr-2">🔊</span>
              <h3 className="font-semibold">Draw and Chat Room</h3>
              <span className="ml-2 text-sm text-gray-400">({roomId})</span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-600 rounded" title="Call">📞</button>
              <button className="p-2 hover:bg-gray-600 rounded" title="Video">📹</button>
              <button className="p-2 hover:bg-gray-600 rounded" title="Screen Share">📺</button>
              <button className="p-2 hover:bg-gray-600 rounded" title="Settings">⚙️</button>
              <button
                onClick={leaveRoom}
                className="p-2 hover:bg-red-600 bg-red-500 rounded text-white"
                title="Leave Room"
              >
                🚪
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
                    <span className="ml-2 bg-red-500 text-white text-xs px-1 rounded">
                      LIVE
                    </span>
                  )}
                </div>

                {/* Drawing Indicator */}
                {participant.isDrawing && (
                  <div className="absolute top-2 right-2 bg-blue-500 p-1 rounded">
                    ✏️
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main Screen Share Area */}
          <div className="mt-4 bg-gray-700 rounded-lg p-4 text-center">
            <div className="bg-white text-black p-8 rounded inline-block">
              <div className="text-6xl mb-4">📐</div>
              <div className="text-xl font-semibold">Nelly's Stream</div>
              <div className="text-red-500 font-bold">● LIVE</div>
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
            {isMuted ? '🔇' : '🎤'}
          </button>
          
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-full ${
              isVideoOff ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? '📹' : '📹'}
          </button>
          
          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-3 rounded-full ${
              isScreenSharing ? 'bg-green-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            📺
          </button>
          
          <button
            onClick={leaveRoom}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600"
            title="Leave call"
          >
            📞
          </button>
        </div>
      </div>
    </div>
  );
}
