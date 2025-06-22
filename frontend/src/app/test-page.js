'use client';
import { Frijole } from 'next/font/google';

const frijole = Frijole({
  weight: '400',
  subsets: ['latin'],
});

export default function SimpleHome() {
  return (
    <div className="min-h-screen bg-amber-50 text-gray-800">
      <div className="bg-amber-200 border-b-4 border-amber-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <h1 className={`text-4xl font-bold text-amber-900 ${frijole.className} drop-shadow-sm`}>
              PUBLICPOOPER
            </h1>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-amber-900 mb-4">Welcome to PublicPooper</h2>
          <p className="text-amber-700">The platform is loading...</p>
        </div>
      </div>
    </div>
  );
}
