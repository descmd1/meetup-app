import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from 'date-fns';
import API from "../utils/api";
import VideoCall from "./VideoCall";
import EmojiPicker from "../components/EmojiPicker";
import SubscriptionPaywall from "../components/SubscriptionPaywall";
import "./ChatPage.css";

const Chat = ({ 
  users, 
  setUsers, 
  selectedUser, 
  setSelectedUser, 
  currentUser,
  onlineUsers,
  socket,
  addNotification 
}) => {
  const { receiverId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [replyToId, setReplyToId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editMessageId, setEditMessageId] = useState(null);
  
  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Selection state
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Video call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  
  // Subscription state
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');

  const config = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  // Check subscription status
  const checkSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await API.get('/subscription/status', config);
      
      console.log('Subscription status check:', response.data);
      setSubscriptionStatus(response.data.status);
      return response.data.status === 'active';
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus('free');
      return false;
    }
  };

  // Load subscription status on component mount and when user changes
  useEffect(() => {
    if (currentUser) {
      checkSubscription();
    }
  }, [currentUser]);

  // Also refresh subscription status when returning from payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      checkSubscription();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.message-actions')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Toggle dropdown for message actions
  const toggleDropdown = (messageId) => {
    setActiveDropdown(activeDropdown === messageId ? null : messageId);
  };

  // Emoji functions
  const handleEmojiSelect = (emoji) => {
    setText(text + emoji);
    setShowEmojiPicker(false);
  };

  // Selection functions
  const toggleSelection = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
    
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const startSelection = (messageId) => {
    setIsSelectionMode(true);
    setSelectedMessages(new Set([messageId]));
    setActiveDropdown(null);
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
    setIsSelectionMode(false);
  };

  // Message action functions
  const handleCopy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      addNotification('Message copied to clipboard', 'success', 2000);
    } catch (err) {
      addNotification('Failed to copy message', 'error', 2000);
    }
    setActiveDropdown(null);
  };

  const handleForward = (message) => {
    // You can implement forward functionality here
    addNotification('Forward feature coming soon', 'info', 2000);
    setActiveDropdown(null);
  };

  const handleShare = (message) => {
    if (navigator.share) {
      navigator.share({
        text: message.text
      }).catch(console.error);
    } else {
      handleCopy(message);
    }
    setActiveDropdown(null);
  };

  const deleteSelectedMessages = async () => {
    try {
      for (const messageId of selectedMessages) {
        await handleDelete(messageId);
      }
      clearSelection();
      addNotification(`${selectedMessages.size} message(s) deleted`, 'success');
    } catch (err) {
      addNotification('Failed to delete messages', 'error');
    }
  };

  // Set selected user from URL params
  useEffect(() => {
    if (receiverId && receiverId !== selectedUser) {
      const user = users.find(u => u._id === receiverId);
      if (user) {
        setSelectedUser(user._id);
      }
    }
  }, [receiverId, users, setSelectedUser, selectedUser]);

  // Load messages when selected user changes
  useEffect(() => {
    if (!selectedUser || !currentUser) return;
    
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    };
    
    setLoading(true);
    API.get(`/messages/${selectedUser}`, config)
      .then((res) => {
        setMessages(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading messages:", err);
        addNotification?.("Failed to load messages", "error");
        setLoading(false);
      });
  }, [selectedUser, currentUser, addNotification]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleReceiveMessage = (message) => {
      if (
        (message.sender === selectedUser && message.receiver === currentUser._id) ||
        (message.sender === currentUser._id && message.receiver === selectedUser)
      ) {
        // Check if message already exists to prevent duplicates
        setMessages((prev) => {
          const messageExists = prev.some(m => m._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    const handleTypingStart = ({ userId, userName }) => {
      if (userId === selectedUser) {
        setTypingUsers(prev => new Set([...prev, userName]));
      }
    };

    const handleTypingStop = ({ userId }) => {
      if (userId === selectedUser) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          const user = users.find(u => u._id === userId);
          if (user) newSet.delete(user.name);
          return newSet;
        });
      }
    };

    const handleMessageUpdate = (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    };

    const handleMessageDelete = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, text: "This message was deleted", deleted: true }
            : m
        )
      );
    };

    const handleMessageEdit = ({ messageId, newText }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, text: newText, edited: true }
            : msg
        )
      );
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing-start", handleTypingStart);
    socket.on("typing-stop", handleTypingStop);
    socket.on("update-message", handleMessageUpdate);
    socket.on("delete-message", handleMessageDelete);
    socket.on("edit-message", handleMessageEdit);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("typing-start", handleTypingStart);
      socket.off("typing-stop", handleTypingStop);
      socket.off("update-message", handleMessageUpdate);
      socket.off("delete-message", handleMessageDelete);
      socket.off("edit-message", handleMessageEdit);
    };
  }, [socket, selectedUser, currentUser, users]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    if (!typing && selectedUser) {
      setTyping(true);
      socket?.emit("typing-start", { 
        to: selectedUser, 
        userId: currentUser._id,
        userName: currentUser.name 
      });
    }

    // Clear existing timeout
    clearTimeout(window.typingTimeout);
    
    // Set new timeout
    window.typingTimeout = setTimeout(() => {
      setTyping(false);
      socket?.emit("typing-stop", { 
        to: selectedUser, 
        userId: currentUser._id 
      });
    }, 2000);
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedUser || loading) return;

    // Check subscription before sending message
    const hasSubscription = await checkSubscription();
    if (!hasSubscription) {
      setPaywallFeature('messaging');
      setShowPaywall(true);
      return;
    }

    try {
      setLoading(true);
      const messageData = {
        receiver: selectedUser,
        text: text.trim(),
        replyTo: replyToId
      };

      const res = await API.post("/messages", messageData, config);
      
      // Don't add to local state here - let the socket event handle it
      // This prevents duplicates and ensures real-time updates work properly
      
      setText("");
      setReplyToId(null);
      
      // Stop typing indicator
      setTyping(false);
      socket?.emit("typing-stop", { 
        to: selectedUser, 
        userId: currentUser._id 
      });
      
    } catch (err) {
      console.error("Error sending message:", err);
      
      // Check if error is subscription-related
      if (err.response?.status === 403 && err.response?.data?.subscriptionRequired) {
        setPaywallFeature('messaging');
        setShowPaywall(true);
        return;
      }
      
      addNotification?.("Failed to send message", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLike = async (messageId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      };
      const res = await API.put(
        "/messages/like",
        { messageId, action: "like" },
        config
      );
      // Don't update local state here - let the socket event handle it for real-time updates
    } catch (err) {
      addNotification?.("Failed to like message", "error");
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    
    try {
      await API.put("/messages/delete", { messageId }, config);
      // Don't update local state here - let the socket event handle it for real-time updates
      addNotification?.("Message deleted", "success");
    } catch (err) {
      addNotification?.("Failed to delete message", "error");
    }
  };

  const handleEdit = (msg) => {
    setEditMode(true);
    setEditMessageId(msg._id);
    setText(msg.text);
  };

  const handleUpdate = async () => {
    if (!text.trim()) return;
    
    try {
      await API.put(
        "/messages/edit",
        {
          messageId: editMessageId,
          newText: text.trim(),
        },
        config
      );

      // Don't emit socket event here - backend will handle it for real-time updates

      setEditMode(false);
      setEditMessageId(null);
      setText("");
      addNotification?.("Message updated", "success");
    } catch (err) {
      addNotification?.("Failed to update message", "error");
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditMessageId(null);
    setText("");
  };

  const handleReply = (msg) => {
    setReplyToId(msg._id);
    setText(''); // Clear text, let user type their own reply
  };

  const formatTime = (isoDate) => {
    if (!isoDate) return '';
    return format(new Date(isoDate), 'p');
  };

  const getSelectedUserInfo = () => {
    if (!selectedUser) return null;
    return users.find(u => u._id === selectedUser);
  };

  const selectedUserInfo = getSelectedUserInfo();
  const isUserOnline = selectedUserInfo && onlineUsers?.includes(selectedUser);

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <h3 className="sidebar-title">Conversations</h3>
        <div className="users-list">
          {users.map((user) => (
            <div
              key={user._id}
              className={`user-item ${selectedUser === user._id ? "active" : ""}`}
              onClick={() => {
                setSelectedUser(user._id);
                navigate(`/chat/${user._id}`);
              }}
            >
              <div className="user-avatar">
                <img 
                  src={user.profilePic || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                  alt={user.name}
                  className="avatar-img"
                />
                {onlineUsers?.includes(user._id) && (
                  <div className="online-indicator"></div>
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-status">
                  {onlineUsers?.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {selectedUserInfo ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="header-user-info">
                <img 
                  src={selectedUserInfo.profilePic || `https://ui-avatars.com/api/?name=${selectedUserInfo.name}&background=random`}
                  alt={selectedUserInfo.name}
                  className="header-avatar"
                />
                <div className="header-details">
                  <h3 className="header-name">{selectedUserInfo.name}</h3>
                  <div className={`header-status ${isUserOnline ? 'online' : 'offline'}`}>
                    {isUserOnline ? '🟢 Online' : '🔴 Offline'}
                  </div>
                </div>
              </div>

              {/* Your Subscription Status */}
              <div className="subscription-status">
                {subscriptionStatus === 'active' ? (
                  <span className="premium-badge">✨ Premium</span>
                ) : subscriptionStatus === 'expired' ? (
                  <span className="expired-badge">⚠️ Subscription Expired</span>
                ) : (
                  <span className="free-badge">🆓 Free - Upgrade to Premium</span>
                )}
              </div>
              
              {/* Call Buttons */}
              <div className="call-buttons">
                <button 
                  className={`call-btn audio-call ${!isUserOnline ? 'offline' : ''}`}
                  onClick={async () => {
                    console.log('Audio call button clicked in Chat');
                    const hasSubscription = await checkSubscription();
                    if (!hasSubscription) {
                      setPaywallFeature('audio-call');
                      setShowPaywall(true);
                      return;
                    }
                    setIsAudioOnly(true);
                    setShowVideoCall(true);
                  }}
                  title={isUserOnline ? "Start audio call" : "Start audio call (user appears offline)"}
                >
                  📞
                </button>
                <button 
                  className={`call-btn video-call ${!isUserOnline ? 'offline' : ''}`}
                  onClick={async () => {
                    console.log('Video call button clicked in Chat');
                    const hasSubscription = await checkSubscription();
                    if (!hasSubscription) {
                      setPaywallFeature('video-call');
                      setShowPaywall(true);
                      return;
                    }
                    setIsAudioOnly(false);
                    setShowVideoCall(true);
                  }}
                  title={isUserOnline ? "Start video call" : "Start video call (user appears offline)"}
                >
                  📹
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-container">
              {loading ? (
                <div className="loading-messages">
                  <div className="spinner"></div>
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`message ${msg.sender === currentUser._id ? "sent" : "received"} ${msg.deleted ? "deleted" : ""} ${
                        selectedMessages.has(msg._id) ? "selected" : ""
                      }`}
                      onClick={() => isSelectionMode && !msg.deleted && toggleSelection(msg._id)}
                    >
                      {isSelectionMode && !msg.deleted && (
                        <div className="selection-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedMessages.has(msg._id)}
                            onChange={() => toggleSelection(msg._id)}
                            className="message-checkbox"
                          />
                        </div>
                      )}
                      
                      {msg.replyTo && (
                        <div className="reply-info">
                          <div className="reply-header">
                            <span className="reply-icon">↪️</span>
                            <span className="reply-author">{msg.replyTo.sender?.name || 'User'}</span>
                          </div>
                          <div className="reply-content">
                            {msg.replyTo.text ? (
                              msg.replyTo.text.length > 100 
                                ? `${msg.replyTo.text.substring(0, 100)}...` 
                                : msg.replyTo.text
                            ) : 'Message not available'}
                          </div>
                        </div>
                      )}
                      
                      <div className="message-content">
                        <p className="message-text">{msg.text}</p>
                        {msg.edited && (
                          <span className="edited-indicator">(edited)</span>
                        )}
                      </div>
                      
                      <div className="message-footer">
                        <span className="message-time">
                          {formatTime(msg.createdAt)}
                        </span>
                        
                        {!isSelectionMode && msg.sender === currentUser._id && !msg.deleted && (
                          <div className="message-actions">
                            <button 
                              onClick={() => toggleDropdown(msg._id)}
                              className="action-btn dropdown-trigger"
                              title="Message options"
                            >
                              ⋯
                            </button>
                            
                            {activeDropdown === msg._id && (
                              <div className="dropdown-menu my-message-dropdown">
                                <button 
                                  onClick={() => {
                                    handleCopy(msg);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">📋</span>
                                  Copy
                                </button>
                                <button 
                                  onClick={() => {
                                    handleEdit(msg);
                                    setActiveDropdown(null);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">✏️</span>
                                  Edit
                                </button>
                                <button 
                                  onClick={() => {
                                    handleForward(msg);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">↗️</span>
                                  Forward
                                </button>
                                <button 
                                  onClick={() => {
                                    startSelection(msg._id);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">☑️</span>
                                  Select
                                </button>
                                <button 
                                  onClick={() => {
                                    handleShare(msg);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">📤</span>
                                  Share
                                </button>
                                <button 
                                  onClick={() => {
                                    handleDelete(msg._id);
                                    setActiveDropdown(null);
                                  }}
                                  className="dropdown-item delete-item"
                                >
                                  <span className="dropdown-icon">🗑️</span>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!isSelectionMode && msg.sender !== currentUser._id && !msg.deleted && (
                          <div className="message-actions">
                            <button 
                              onClick={() => toggleDropdown(msg._id)}
                              className="action-btn dropdown-trigger"
                              title="Message options"
                            >
                              ⋯
                            </button>
                            
                            {activeDropdown === msg._id && (
                              <div className="dropdown-menu other-message-dropdown">
                                <button 
                                  onClick={() => {
                                    handleCopy(msg);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">📋</span>
                                  Copy
                                </button>
                                <button 
                                  onClick={() => {
                                    handleReply(msg);
                                    setActiveDropdown(null);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">↪️</span>
                                  Reply
                                </button>
                                <button 
                                  onClick={() => {
                                    handleForward(msg);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">↗️</span>
                                  Forward
                                </button>
                                <button 
                                  onClick={() => {
                                    startSelection(msg._id);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">☑️</span>
                                  Select
                                </button>
                                <button 
                                  onClick={() => {
                                    handleShare(msg);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">📤</span>
                                  Share
                                </button>
                                <button 
                                  onClick={() => {
                                    handleLike(msg._id);
                                    setActiveDropdown(null);
                                  }}
                                  className="dropdown-item"
                                >
                                  <span className="dropdown-icon">👍</span>
                                  Like ({msg.likes?.length || 0})
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {typingUsers.size > 0 && (
                    <div className="typing-indicator">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="typing-text">
                        {Array.from(typingUsers).join(', ')} 
                        {typingUsers.size === 1 ? ' is' : ' are'} typing...
                      </span>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Selection Toolbar */}
            {isSelectionMode && (
              <div className="selection-toolbar">
                <div className="selection-info">
                  <span>{selectedMessages.size} selected</span>
                </div>
                <div className="selection-actions">
                  <button onClick={() => handleForward(null)} className="toolbar-btn">
                    <span>↗️</span> Forward
                  </button>
                  <button onClick={() => handleShare(null)} className="toolbar-btn">
                    <span>📤</span> Share
                  </button>
                  <button onClick={deleteSelectedMessages} className="toolbar-btn delete">
                    <span>🗑️</span> Delete
                  </button>
                  <button onClick={clearSelection} className="toolbar-btn cancel">
                    <span>✕</span> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            {!isSelectionMode && (
              <div className="chat-input-container">
                {replyToId && (
                  <div className="reply-preview">
                    <div className="reply-preview-content">
                      <span className="reply-preview-icon">↪️</span>
                      <div className="reply-preview-text">
                        <div className="reply-preview-header">Replying to:</div>
                        <div className="reply-preview-message">
                          {(() => {
                            const replyMsg = messages.find(m => m._id === replyToId);
                            if (replyMsg) {
                              const text = replyMsg.text || 'Message not available';
                              return text.length > 50 ? `${text.substring(0, 50)}...` : text;
                            }
                            return 'Message not found';
                          })()}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setReplyToId(null)}
                      className="cancel-reply"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                {editMode && (
                  <div className="edit-mode">
                    <span>✏️ Editing message</span>
                    <button 
                      onClick={cancelEdit}
                      className="cancel-edit"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                <div className="input-row">
                  <div className="input-actions">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="emoji-btn"
                      title="Add emoji"
                    >
                      😊
                    </button>
                  </div>
                  
                  <textarea
                    value={text}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      subscriptionStatus === 'active' 
                        ? (editMode ? "Edit your message..." : "Type a message...") 
                        : "🔒 Upgrade to Premium to send messages"
                    }
                    className={`message-input ${subscriptionStatus !== 'active' ? 'disabled-input' : ''}`}
                    disabled={loading || subscriptionStatus !== 'active'}
                    rows={1}
                  />

                  
                  <button
                    onClick={subscriptionStatus === 'active' ? (editMode ? handleUpdate : handleSend) : async () => {
                      const hasSubscription = await checkSubscription();
                      if (!hasSubscription) {
                        setPaywallFeature('messaging');
                        setShowPaywall(true);
                      }
                    }}
                    disabled={subscriptionStatus === 'active' ? (!text.trim() || loading) : false}
                    className={`send-btn ${subscriptionStatus !== 'active' ? 'premium-required' : ''}`}
                    title={subscriptionStatus !== 'active' ? 'Upgrade to Premium to send messages' : ''}
                  >
                    {loading ? "..." : subscriptionStatus !== 'active' ? "🔒" : editMode ? "✅" : "➤"}
                  </button>
                </div>
                
                {/* Emoji Picker */}
                <EmojiPicker
                  isOpen={showEmojiPicker}
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-content">
              <h3>💬 Welcome to Chat</h3>
              <p>Select a user from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Call Component */}
      <VideoCall
        currentUserId={currentUser?._id}
        targetUserId={selectedUser}
        isAudioOnly={isAudioOnly}
        showVideoCall={showVideoCall}
        setShowVideoCall={setShowVideoCall}
        socket={socket}
      />

      {/* Subscription Paywall Modal */}
      {showPaywall && (
        <SubscriptionPaywall
          feature={paywallFeature}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
};

export default Chat;