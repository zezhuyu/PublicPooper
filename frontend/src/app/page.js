'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Poop and Chat</h1>
          <p className="text-gray-400">Join a video to be a competitive pooper</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="space-y-4">
            {/* Create New Room */}
            <button
              onClick={createNewRoom}
              disabled={isJoining}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isJoining ? 'Creating Room...' : 'Create New Room'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">or</span>
              </div>
            </div>

            {/* Join Existing Room */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
              <button
                onClick={() => joinRoom(roomId)}
                disabled={!roomId.trim() || isJoining}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-600">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Rooms</h3>
            <div className="space-y-2">
              <button
                onClick={() => joinRoom('art-studio-2024')}
                className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">🎨 Art Studio</div>
                    <div className="text-sm text-gray-400">art-studio-2024</div>
                  </div>
                  <div className="text-green-400 text-sm">4 online</div>
                </div>
              </button>
              
              <button
                onClick={() => joinRoom('creative-minds-hub')}
                className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">💡 Creative Minds</div>
                    <div className="text-sm text-gray-400">creative-minds-hub</div>
                  </div>
                  <div className="text-green-400 text-sm">2 online</div>
                </div>
              </button>

              <button
                onClick={() => joinRoom('design-workshop')}
                className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">🖌️ Design Workshop</div>
                    <div className="text-sm text-gray-400">design-workshop</div>
                  </div>
                  <div className="text-gray-400 text-sm">offline</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-gray-400">
          <p>Share room IDs with friends to collaborate together</p>
        </div>
      </div>
    </div>
  );
}
