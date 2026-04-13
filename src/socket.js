import { io } from 'socket.io-client';

// In development, Vite proxies /socket.io to the backend server.
// In production, both are served from the same origin.
const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (data) => {
  console.error('Server error:', data.message);
});

export default socket;
