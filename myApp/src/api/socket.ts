import { io } from 'socket.io-client';
import { BASE_URL } from './client';

const socket = io(BASE_URL, {
  transports: ['websocket'],
  autoConnect: false, // We will connect manually when we have the token
});

export default socket;
