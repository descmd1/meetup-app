import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

export const useSocket = (serverUrl = 'http://localhost:5000') => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const newSocket = io(serverUrl, {
      transports: ['websocket'],
      timeout: 20000,
      forceNew: true
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Auto-register any pending user
      const pendingUserId = sessionStorage.getItem('pendingUserRegistration');
      if (pendingUserId) {
        console.log('🔄 Auto-registering pending user:', pendingUserId);
        newSocket.emit('register', { userId: String(pendingUserId) });
        console.log(`🟢 Auto-registered pending user: ${pendingUserId}`);
        sessionStorage.removeItem('pendingUserRegistration');
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
      
      // Attempt to reconnect if disconnection wasn't intentional
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      
      attemptReconnect(newSocket);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      attemptReconnect(newSocket);
    });

    // Online users management
    newSocket.on('users-online', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user-connected', (userId) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    newSocket.on('user-disconnected', (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    setSocket(newSocket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.close();
    };
  }, [serverUrl]);

  const attemptReconnect = (socketInstance) => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
      reconnectAttemptsRef.current++;
      socketInstance.connect();
    }, delay);
  };

  const registerUser = useCallback((userId) => {
    if (socket && isConnected && userId) {
      console.log(`🔄 Attempting to register user: ${userId}`);
      socket.emit('register', { userId: String(userId) });
      console.log(`🟢 Registered user: ${userId} with socket ID: ${socket.id}`);
    } else {
      console.log('❌ Cannot register user - will retry when socket connects:', {
        socket: !!socket,
        isConnected,
        userId
      });
      // Store the userId to register when socket connects
      if (userId) {
        sessionStorage.setItem('pendingUserRegistration', userId);
      }
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((messageData) => {
    if (socket && isConnected) {
      socket.emit('send-message', messageData);
    }
  }, [socket, isConnected]);

  const callUser = useCallback((callData) => {
    if (socket && isConnected) {
      socket.emit('callUser', callData);
    }
  }, [socket, isConnected]);

  const answerCall = useCallback((answerData) => {
    if (socket && isConnected) {
      socket.emit('answerCall', answerData);
    }
  }, [socket, isConnected]);

  const endCall = useCallback((endData) => {
    if (socket && isConnected) {
      socket.emit('endCall', endData);
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    onlineUsers,
    registerUser,
    sendMessage,
    callUser,
    answerCall,
    endCall
  };
};

export default useSocket;