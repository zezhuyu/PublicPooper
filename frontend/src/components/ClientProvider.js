'use client';
import { UserProvider } from '../contexts/UserContext';

export default function ClientProvider({ children }) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
}
