import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';

const ChatBox = ({ messages, onSend, currentUserId, selectedUser, isTyping = false }) => {
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (date) => {
    try {
      return format(new Date(date), 'HH:mm');
    } catch (error) {
      return '';
    }
  };

  const formatMessageDate = (date) => {
    try {
      const messageDate = new Date(date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (messageDate.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return format(messageDate, 'MMM dd, yyyy');
      }
    } catch (error) {
      return '';
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Chat Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-800">
          {selectedUser ? `Chat with ${selectedUser.name || selectedUser}` : 'Select a user to chat'}
        </h3>
        {isTyping && (
          <p className="text-sm text-gray-500 italic">Typing...</p>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="mb-2">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date Separator */}
              <div className="flex justify-center mb-4">
                <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((msg, index) => {
                const isCurrentUser = String(msg.sender) === String(currentUserId);
                const prevMessage = index > 0 ? dateMessages[index - 1] : null;
                const showAvatar = !prevMessage || String(prevMessage.sender) !== String(msg.sender);

                return (
                  <div
                    key={msg._id || `msg-${index}`}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${
                      showAvatar ? 'mt-4' : 'mt-1'
                    }`}
                  >
                    {!isCurrentUser && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-600">
                          {(msg.senderName || msg.sender || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!isCurrentUser && !showAvatar && (
                      <div className="w-8 mr-2"></div>
                    )}

                    <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                      {showAvatar && !isCurrentUser && (
                        <p className="text-xs text-gray-500 mb-1 ml-2">
                          {msg.senderName || msg.sender}
                        </p>
                      )}
                      
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          isCurrentUser
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-gray-200 text-gray-800 rounded-bl-sm'
                        } ${msg.deleted ? 'italic opacity-75' : ''}`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        {msg.edited && (
                          <span className="text-xs opacity-75">(edited)</span>
                        )}
                      </div>
                      
                      <p className={`text-xs text-gray-400 mt-1 ${
                        isCurrentUser ? 'text-right' : 'text-left ml-2'
                      }`}>
                        {formatMessageTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
              <span className="text-sm font-medium text-gray-600">...</span>
            </div>
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 border-t bg-gray-50 rounded-b-lg">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedUser ? "Type a message..." : "Select a user to start chatting"}
            disabled={!selectedUser}
            maxLength={1000}
          />
          <button 
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
            disabled={!input.trim() || !selectedUser}
          >
            Send
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Press Enter to send • Shift+Enter for new line
        </div>
      </form>
    </div>
  );
};

export default ChatBox;