import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import SubscriptionBanner from './components/SubscriptionBanner';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import UsersList from './pages/UsersList';
import Subscription from './pages/Subscription';
import SubscriptionCallback from './pages/SubscriptionCallback';
import Notification, { useNotification } from './components/Notification';
import { useSocket } from './hooks/useSocket';
import './styles/enhancements.css';

const App = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Track if welcome message has been shown to prevent duplicates
  const welcomeShownRef = useRef(false);

  const { socket, isConnected, onlineUsers, registerUser } = useSocket();
  const { addNotification, NotificationContainer } = useNotification();

    // Check authentication and get current user - run only once on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    console.log('Auth check - Token:', token ? 'exists' : 'missing');
    console.log('Auth check - UserId:', userId);
    
    if (token && userId) {
      console.log('Token and userId found, attempting to fetch user data...');
      setIsAuthenticated(true);
      
      // Fetch current user info and all users
      Promise.all([
        fetch("http://localhost:5000/api/user/me", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://localhost:5000/api/user/all", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      .then(async ([userRes, allUsersRes]) => {
        console.log('User response status:', userRes.status);
        console.log('All users response status:', allUsersRes.status);
        
        if (userRes.ok && allUsersRes.ok) {
          const currentUserData = await userRes.json();
          const allUsersData = await allUsersRes.json();
          
          console.log('Successfully fetched user data:', currentUserData.name);
          
          setCurrentUser(currentUserData);
          setUsers(allUsersData.filter(user => user._id !== currentUserData._id));
          
          // Register with socket
          registerUser(currentUserData._id);
          
          // Show welcome message only once per session
          if (!welcomeShownRef.current) {
            addNotification(`Welcome back, ${currentUserData.name}!`, 'success');
            welcomeShownRef.current = true;
          }
        } else {
          throw new Error(`Failed to fetch user data - User: ${userRes.status}, All: ${allUsersRes.status}`);
        }
      })
      .catch((err) => {
        console.error("Authentication error:", err);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setIsAuthenticated(false);
        addNotification('Session expired. Please login again.', 'warning');
      })
      .finally(() => {
        console.log('Setting loading to false');
        setLoading(false);
      });
    } else {
      console.log('No token or userId found, showing login page');
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []); // Empty dependency array - run only once on mount

  // Auto-register user when socket connects
  useEffect(() => {
    if (socket && isConnected && currentUser && currentUser._id) {
      console.log('🔄 Auto-registering user on socket connection:', currentUser._id, currentUser.name);
      registerUser(currentUser._id);
    } else {
      console.log('🔄 Auto-registration conditions not met:', {
        socket: !!socket,
        isConnected,
        currentUser: currentUser?.name || 'none',
        currentUserId: currentUser?._id || 'none'
      });
    }
  }, [socket, isConnected, currentUser, registerUser]);

  // Socket connection status notifications
  useEffect(() => {
    if (socket) {
      const handleConnect = () => {
        addNotification('Connected to server', 'success', 3000);
      };
      
      const handleDisconnect = () => {
        addNotification('Disconnected from server', 'warning', 5000);
      };

      const handleReconnect = () => {
        addNotification('Reconnected to server', 'success', 3000);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('reconnect', handleReconnect);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('reconnect', handleReconnect);
      };
    }
  }, [socket, addNotification]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUsers([]);
    setSelectedUser(null);
    
    // Reset welcome message flag for next login
    welcomeShownRef.current = false;
    
    if (socket) {
      socket.disconnect();
    }
    
    addNotification('Logged out successfully', 'info');
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userData._id);
    localStorage.setItem('userName', userData.name);
    
    setIsAuthenticated(true);
    setCurrentUser(userData);
    
    // Register with socket
    registerUser(userData._id);
    
    // Show welcome message only once per session
    if (!welcomeShownRef.current) {
      addNotification(`Welcome, ${userData.name}!`, 'success');
      welcomeShownRef.current = true;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Navigation - only show if authenticated */}
        {isAuthenticated && (
          <Navbar 
            users={users} 
            selectedUser={selectedUser}
            onlineUsers={onlineUsers}
            currentUser={currentUser}
            onLogout={handleLogout}
            socket={socket}
          />
        )}

        {/* Subscription Banner - only show if authenticated */}
        {isAuthenticated && currentUser && (
          <SubscriptionBanner currentUser={currentUser} />
        )}

        {/* Connection Status Indicator */}
        {isAuthenticated && (
          <div className={`fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs z-40 ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        )}

        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              !isAuthenticated ? (
                <Login onLogin={handleLogin} addNotification={addNotification} />
              ) : (
                <Navigate to="/chat" replace />
              )
            } 
          />
          <Route 
            path="/signup" 
            element={
              !isAuthenticated ? (
                <Signup addNotification={addNotification} />
              ) : (
                <Navigate to="/chat" replace />
              )
            } 
          />

          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/chat" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              isAuthenticated ? (
                <Profile 
                  currentUser={currentUser}
                  addNotification={addNotification}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route
            path="/chat"
            element={
              isAuthenticated ? (
                <Chat 
                  users={users}
                  setUsers={setUsers}
                  selectedUser={selectedUser}
                  setSelectedUser={setSelectedUser}
                  currentUser={currentUser}
                  onlineUsers={onlineUsers}
                  socket={socket}
                  addNotification={addNotification}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          
          <Route
            path="/chat/:receiverId"
            element={
              isAuthenticated ? (
                <Chat 
                  users={users}
                  setUsers={setUsers}
                  selectedUser={selectedUser}
                  setSelectedUser={setSelectedUser}
                  currentUser={currentUser}
                  onlineUsers={onlineUsers}
                  socket={socket}
                  addNotification={addNotification}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

                    <Route 
            path="/users" 
            element={
              isAuthenticated ? (
                <UsersList onlineUsers={onlineUsers} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route 
            path="/subscription" 
            element={
              isAuthenticated ? (
                <Subscription 
                  currentUser={currentUser}
                  addNotification={addNotification}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route 
            path="/subscription/callback" 
            element={
              isAuthenticated ? (
                <SubscriptionCallback 
                  addNotification={addNotification}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Catch-all route */}
          <Route 
            path="*" 
            element={
              <Navigate to={isAuthenticated ? "/chat" : "/login"} replace />
            } 
          />
        </Routes>

        {/* Global Notification Container */}
        <NotificationContainer />
      </div>
  );
};

export default App;
