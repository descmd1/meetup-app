import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VideoCall from '../pages/VideoCall';
import '../pages/ChatPage.css';

const Navbar = ({ users, selectedUser, onlineUsers = [], socket, currentUser }) => {
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  if (!Array.isArray(users)) {
    console.warn("Expected users to be an array but got:", typeof users);
    return null;
  }

  const openVideoCall = (audio = false) => {
    if (!selectedUser || !user) {
      alert("Please select a valid user to call.");
      return;
    }

    setIsAudioOnly(audio);
    setShowVideoCall(true);
  };

  const user = users?.find((u) => String(u._id) === String(selectedUser));
  const isUserOnline = user && onlineUsers.includes(String(user._id));

  return (
    <>
      <nav className="bg-pink-500 p-4 text-white flex justify-between items-center shadow-md">
        <div className="font-bold text-lg">💬 MeetupApp</div>

        <div className="space-x-6 hidden md:flex">
          <Link 
            to="/chat" 
            className="hover:bg-pink-600 px-3 py-2 rounded transition-colors"
          >
            💬 Chat
          </Link>
          <Link 
            to="/profile" 
            className="hover:bg-pink-600 px-3 py-2 rounded transition-colors"
          >
            👤 Profile
          </Link>
          <Link 
            to="/users" 
            className="hover:bg-pink-600 px-3 py-2 rounded transition-colors"
          >
            👥 Users
          </Link>
          <Link 
            to="/subscription" 
            className="hover:bg-pink-600 px-3 py-2 rounded transition-colors bg-yellow-500 text-black font-semibold"
          >
            💎 Premium
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-3 bg-pink-600 px-3 py-2 rounded-lg">
              <div className="relative">
                <img
                  src={user.avatar || '/default-avatar.png'}
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div 
                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    isUserOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  title={isUserOnline ? 'Online' : 'Offline'}
                />
              </div>
              <div className="text-left">
                <h4 className="text-white font-medium text-sm">{user.name}</h4>
                <p className="text-pink-200 text-xs">
                  {isUserOnline ? '🟢 Online' : '🔴 Offline'}
                </p>
              </div>
            </div>
          )}

          {user && (
            <div className="flex items-center space-x-2">
              <button 
                title={isUserOnline ? "Video Call" : "Video Call (user appears offline)"}
                onClick={() => openVideoCall(false)}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                  isUserOnline 
                    ? 'bg-green-500 hover:bg-green-600 hover:scale-105' 
                    : 'bg-gray-500 hover:bg-gray-600'
                } shadow-md hover:shadow-lg`}
              >
                <span className="text-lg">📹</span>
              </button>
              <button 
                title={isUserOnline ? "Audio Call" : "Audio Call (user appears offline)"}
                onClick={() => openVideoCall(true)}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                  isUserOnline 
                    ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105' 
                    : 'bg-gray-500 hover:bg-gray-600'
                } shadow-md hover:shadow-lg`}
              >
                <span className="text-lg">📞</span>
              </button>
            </div>
          )}

          {!user && selectedUser && (
            <div className="text-sm text-pink-200">
              Select a user to start calling
            </div>
          )}
        </div>
      </nav>

      {/* Video Call Component - Always rendered so minimized calls can show */}
      <VideoCall
        currentUserId={currentUser?._id}
        targetUserId={selectedUser}
        targetUser={user}
        isAudioOnly={isAudioOnly}
        showVideoCall={showVideoCall}
        setShowVideoCall={setShowVideoCall}
        currentUserName={currentUser?.name}
        targetUserName={user?.name}
        socket={socket}
      />
    </>
  );
};

export default Navbar;
