import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';

const VideoCall = ({ currentUserId, targetUserId, targetUser, isAudioOnly, showVideoCall, setShowVideoCall, socket }) => {

  const [stream, setStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [callerId, setCallerId] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [remoteAudioOnly, setRemoteAudioOnly] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [error, setError] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callAcceptedHandlerRef = useRef(null);
  const callTimerRef = useRef(null);

  const playRingtone = () => {
    try {
      if (!ringtoneRef.current) {
        // Try ringtone.wav first, fallback to untitled-31394.mp3
        ringtoneRef.current = new Audio('/ringtone.wav');
        ringtoneRef.current.onerror = () => {
          console.log('ringtone.wav not found, trying untitled-31394.mp3');
          ringtoneRef.current = new Audio('/untitled-31394.mp3');
        };
        ringtoneRef.current.loop = true;
        ringtoneRef.current.volume = 0.5;
      }
      if (ringtoneRef.current.paused) {
        ringtoneRef.current.play().catch(err => {
          console.warn('Could not play ringtone:', err);
        });
      }
    } catch (err) {
      console.warn('Ringtone error:', err);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  const startCallTimer = () => {
    setCallTimer(0);
    callTimerRef.current = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const minimizeCall = () => {
    setIsMinimized(true);
  };

  const maximizeCall = () => {
    setIsMinimized(false);
  };

  const cleanupPeer = () => {
    if (peerRef.current) {
      try {
        if (callAcceptedHandlerRef.current) {
          socket.off('callAccepted', callAcceptedHandlerRef.current);
          callAcceptedHandlerRef.current = null;
        }
        peerRef.current.destroy();
      } catch (e) {
        console.warn('Peer cleanup error:', e);
      }
      peerRef.current = null;
    }
  };

  const resetState = () => {
    setCallStatus('');
    setError('');
    setCallEnded(false);
    setReceivingCall(false);
    setCallAccepted(false);
    setCallerId('');
    setCallerSignal(null);
    setRemoteAudioOnly(false);
    setCallTimer(0);
    stopCallTimer();
  };

  useEffect(() => {
    if (!currentUserId || !socket) return;

    // User is already registered through the main socket in App.js
    // No need to register again here

    const getUserMedia = async () => {
      try {
        console.log('Requesting media access with constraints:', { video: !isAudioOnly, audio: true });
        const constraints = { video: !isAudioOnly, audio: true };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('Media stream obtained successfully:', mediaStream.getTracks().map(t => t.kind));
        setStream(mediaStream);
        
        if (!isAudioOnly && myVideoRef.current) {
          myVideoRef.current.srcObject = mediaStream;
        }
        setError('');
      } catch (err) {
        console.error('getUserMedia error:', err);
        setError(`Camera/microphone access denied: ${err.message}`);
      }
    };

    // Only get media if we don't already have a stream
    if (!stream) {
      getUserMedia();
    }

    socket.on('callUser', ({ signal, from, isAudioOnly: callerAudioOnly, name }) => {
      console.log('📞 Incoming call received!', {
        from,
        name,
        isAudioOnly: callerAudioOnly,
        currentUserId
      });
      
      setReceivingCall(true);
      setCallerId(String(from));
      setCallerSignal(signal);
      setRemoteAudioOnly(!!callerAudioOnly);
      setShowVideoCall(true);
      setCallStatus(`Incoming ${callerAudioOnly ? 'audio' : 'video'} call from ${name || from}...`);
      playRingtone();
      
      console.log('📞 Call UI should now be visible for incoming call');
    });

    socket.on('callEnded', ({ reason } = {}) => {
      cleanupPeer();
      setCallAccepted(false);
      setCallEnded(true);
      setReceivingCall(false);
      
      const statusMessage = reason === 'not_answered' ? 'Call not answered' : 'Call ended';
      setCallStatus(statusMessage);
      
      setTimeout(() => {
        setShowVideoCall(false);
        resetState();
      }, 2000);
      stopRingtone();
      stopCallTimer();
    });

    return () => {
      socket.off('callUser');
      socket.off('callEnded');
      if (callAcceptedHandlerRef.current) {
        socket.off('callAccepted', callAcceptedHandlerRef.current);
      }
      cleanupPeer();
      stopRingtone();
      stopCallTimer();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentUserId, isAudioOnly, socket]);

  const callUser = () => {
    console.log('callUser function called');
    console.log('Current state:', {
      socket: !!socket,
      stream: !!stream,
      targetUserId,
      currentUserId,
      isAudioOnly
    });

    if (!socket) {
      const errorMsg = 'Socket connection not available.';
      setError(errorMsg);
      console.error('No socket connection');
      return;
    }
    if (!stream) {
      const errorMsg = 'No media stream available. Please check camera/microphone permissions.';
      setError(errorMsg);
      console.error('No media stream');
      return;
    }
    if (!targetUserId) {
      const errorMsg = 'No target user selected.';
      setError(errorMsg);
      console.error('No target user');
      return;
    }
    if (!currentUserId) {
      const errorMsg = 'Current user ID not available.';
      setError(errorMsg);
      console.error('No current user ID');
      return;
    }

    cleanupPeer();
    setCallStatus('Calling...');
    setCallActive(true);
    setError('');

    console.log('Creating peer and emitting callUser event');
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on('signal', (data) => {
      console.log('Peer signal generated, emitting to socket');
      console.log('Call details:', {
        to: String(targetUserId),
        from: String(currentUserId),
        isAudioOnly: !!isAudioOnly,
        name: 'You',
        signal: data
      });
      
      socket.emit('callUser', {
        to: String(targetUserId),
        from: String(currentUserId),
        isAudioOnly: !!isAudioOnly,
        signal: data,
        name: 'You'
      });
      
      console.log('✅ Call event emitted to server');
      playRingtone();
    });

    peer.on('stream', (remoteStream) => {
      if (userVideoRef.current && !isAudioOnly) {
        userVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current && isAudioOnly) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    });

    const handleCallAccepted = ({ signal: answerSignal }) => {
      stopRingtone();
      setCallAccepted(true);
      setCallStatus('Call connected');
      startCallTimer();
      if (peer && !peer.destroyed) {
        peer.signal(answerSignal);
      }
    };

    callAcceptedHandlerRef.current = handleCallAccepted;
    socket.on('callAccepted', handleCallAccepted);

    peer.on('connect', () => {
      console.log('Peer connected');
      stopRingtone();
      setCallStatus('Connected');
    });

    peer.on('close', () => {
      cleanupPeer();
      setCallAccepted(false);
      setCallEnded(true);
      setCallStatus('Call ended');
      setTimeout(() => {
        setShowVideoCall(false);
        resetState();
      }, 2000);
      stopRingtone();
      stopCallTimer();
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setError(`Connection error: ${err.message}`);
      cleanupPeer();
      stopRingtone();
      stopCallTimer();
    });

    peerRef.current = peer;
  };

  const answerCall = () => {
    if (!socket) {
      setError('Socket connection not available.');
      return;
    }
    if (!stream) {
      setError('No media stream available.');
      return;
    }
    
    setCallAccepted(true);
    setCallStatus('Call connected');
    stopRingtone();
    setReceivingCall(false);
    startCallTimer();

    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { 
        to: String(callerId), 
        signal: data,
        from: String(currentUserId)
      });
    });

    peer.on('stream', (remoteStream) => {
      if (userVideoRef.current && !remoteAudioOnly) {
        userVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current && remoteAudioOnly) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    });

    peer.on('connect', () => {
      stopRingtone();
      setCallStatus('Connected');
    });

    if (callerSignal && !peer.destroyed) {
      peer.signal(callerSignal);
    }

    peer.on('close', () => {
      cleanupPeer();
      setCallAccepted(false);
      setCallEnded(true);
      setCallStatus('Call ended');
      setTimeout(() => {
        setShowVideoCall(false);
        resetState();
      }, 2000);
      stopRingtone();
      stopCallTimer();
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setError(`Connection error: ${err.message}`);
    });

    peerRef.current = peer;
  };

  const leaveCall = () => {
    const targetId = receivingCall ? callerId : targetUserId;
    if (socket && targetId) {
      socket.emit('endCall', { 
        to: String(targetId),
        from: String(currentUserId)
      });
    }
    
    cleanupPeer();
    setCallActive(false);
    setCallAccepted(false);
    setCallEnded(true);
    setReceivingCall(false);
    setCallStatus('Call ended');
    setIsMinimized(false);
    
    setTimeout(() => {
      setShowVideoCall(false);
      resetState();
    }, 1000);
    stopRingtone();
    stopCallTimer();
  };

  // Automatically initiate call when component becomes visible and not receiving a call
  useEffect(() => {
    console.log('VideoCall useEffect triggered:', { 
      showVideoCall, 
      receivingCall, 
      callAccepted, 
      callEnded, 
      targetUserId,
      currentUserId,
      hasStream: !!stream,
      hasSocket: !!socket 
    });
    
    if (showVideoCall && !receivingCall && !callAccepted && !callEnded && targetUserId && currentUserId && stream && socket) {
      console.log('All conditions met - initiating call automatically...');
      // Small delay to ensure component is fully rendered and stream is ready
      const timer = setTimeout(() => {
        callUser();
      }, 1000); // Increased delay to ensure stream is ready
      
      return () => clearTimeout(timer);
    } else {
      console.log('Conditions not met for auto-call:', {
        showVideoCall,
        receivingCall: !receivingCall,
        callAccepted: !callAccepted,
        callEnded: !callEnded,
        targetUserId: !!targetUserId,
        currentUserId: !!currentUserId,
        stream: !!stream,
        socket: !!socket
      });
    }
  }, [showVideoCall, receivingCall, callAccepted, callEnded, targetUserId, currentUserId, stream, socket]);

  if (!showVideoCall) {
    console.log('VideoCall component not showing because showVideoCall is false');
    return null;
  }

  const effectiveAudioOnly = isAudioOnly || remoteAudioOnly;

  // Show minimized call if call is active and minimized, regardless of showVideoCall
  if (isMinimized && (callActive || callAccepted || receivingCall || callStatus === 'Calling...')) {
    return (
      <div className="minimized-call">
        <div className="minimized-content" onClick={maximizeCall}>
          <div className="minimized-info">
            <span className="minimized-icon">{effectiveAudioOnly ? '📞' : '📹'}</span>
            <div className="minimized-details">
              <div className="minimized-user">{targetUser?.name || 'User'}</div>
              {callAccepted && callTimer > 0 && (
                <div className="minimized-timer">{formatTime(callTimer)}</div>
              )}
            </div>
          </div>
          <div className="minimized-controls">
            <button className="minimize-btn end-call" onClick={(e) => { e.stopPropagation(); leaveCall(); }} title="End Call">❌</button>
          </div>
        </div>
        {/* Hidden video/audio elements for call to continue */}
        <div style={{ display: 'none' }}>
          {!effectiveAudioOnly && <video ref={myVideoRef} muted playsInline autoPlay />}
          {callAccepted && (
            !effectiveAudioOnly ? (
              <video ref={userVideoRef} playsInline autoPlay />
            ) : (
              <audio ref={remoteAudioRef} autoPlay />
            )
          )}
        </div>
      </div>
    );
  }

  // Don't show the full modal if not showVideoCall and no active call states
  if (!showVideoCall && !callActive && !callAccepted && !receivingCall && !callStatus) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <button className="modal-minimize" onClick={minimizeCall} title="Minimize">➖</button>
          <button className="modal-close" onClick={leaveCall} title="End Call">❌</button>
        </div>
        
        <h2>{effectiveAudioOnly ? 'Audio' : 'Video'} Call</h2>
        
        {error && <div className="error-message">{error}</div>}
        <div className="call-status">
          {callStatus}
          {callAccepted && callTimer > 0 && (
            <span className="call-timer"> - {formatTime(callTimer)}</span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          {!effectiveAudioOnly && (
            <div className="video-container">
              <video ref={myVideoRef} muted playsInline autoPlay />
              <div className="video-label">You</div>
            </div>
          )}

          {callAccepted ? (
            !effectiveAudioOnly ? (
              <div className="video-container">
                <video ref={userVideoRef} playsInline autoPlay />
                <div className="video-label">{receivingCall ? callerId : (targetUser?.name || targetUserId)}</div>
              </div>
            ) : (
              <div className="audio-container">
                <audio ref={remoteAudioRef} autoPlay />
                <div className="audio-visualization">
                  <div className="audio-bars">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="audio-bar"></div>
                    ))}
                  </div>
                  <div className="audio-label">🎤 Audio Call with {receivingCall ? callerId : (targetUser?.name || targetUserId)}</div>
                </div>
              </div>
            )
          ) : (
            <div className="waiting-container">
              <div className="waiting-spinner"></div>
              <div className="waiting-text">Connecting...</div>
            </div>
          )}
        </div>

        <div className="call-controls">
          {!callAccepted && !receivingCall && (
            <button className="call-btn" onClick={callUser}>
              📞 Call
            </button>
          )}
          {receivingCall && !callAccepted && (
            <div className="incoming-call-controls">
              <button className="answer-btn" onClick={answerCall}>✅ Answer</button>
              <button className="decline-btn" onClick={leaveCall}>❌ Decline</button>
            </div>
          )}
          {callAccepted && !callEnded && (
            <button className="end-call-btn" onClick={leaveCall}>❌ End Call</button>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        
        .modal-content {
          background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
          padding: 28px;
          border-radius: 16px;
          width: 90%;
          max-width: 850px;
          position: relative;
          color: white;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: modalSlideIn 0.3s ease-out;
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: white;
          padding: 10px;
          border-radius: 50%;
          transition: all 0.3s ease;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-close:hover {
          background: rgba(239, 68, 68, 0.8);
          transform: scale(1.1);
        }
        
        .error-message {
          background: #f56565;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          margin: 10px 0;
          font-size: 14px;
        }
        
        .call-status {
          text-align: center;
          margin: 10px 0;
          font-style: italic;
          color: #a0aec0;
        }
        
        .call-timer {
          font-weight: bold;
          color: #48bb78;
        }
        
        .video-container {
          position: relative;
          width: 300px;
          height: 200px;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .video-container video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .video-label {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.6);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .audio-container {
          width: 300px;
          height: 200px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .audio-visualization {
          background: #4a5568;
          width: 100%;
          height: 100%;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        
        .audio-bars {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          height: 60px;
          gap: 4px;
          margin-bottom: 16px;
        }
        
        .audio-bar {
          width: 6px;
          background: #4299e1;
          border-radius: 3px;
          height: 20px;
          animation: audioBar 1.5s infinite ease-in-out;
        }
        
        .audio-bar:nth-child(1) { animation-delay: 0.0s; height: 10px; }
        .audio-bar:nth-child(2) { animation-delay: 0.2s; height: 20px; }
        .audio-bar:nth-child(3) { animation-delay: 0.4s; height: 30px; }
        .audio-bar:nth-child(4) { animation-delay: 0.6s; height: 40px; }
        .audio-bar:nth-child(5) { animation-delay: 0.8s; height: 50px; }
        .audio-bar:nth-child(6) { animation-delay: 1.0s; height: 40px; }
        .audio-bar:nth-child(7) { animation-delay: 1.2s; height: 30px; }
        .audio-bar:nth-child(8) { animation-delay: 1.4s; height: 20px; }
        
        @keyframes audioBar {
          0%, 100% { transform: scaleY(0.8); }
          50% { transform: scaleY(1.5); }
        }
        
        .audio-label {
          text-align: center;
          font-size: 16px;
        }
        
        .waiting-container {
          width: 300px;
          height: 200px;
          background: #4a5568;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 16px;
        }
        
        .waiting-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .waiting-text {
          font-size: 16px;
        }
        
        .call-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 24px;
          gap: 16px;
        }
        
        .call-btn, .answer-btn, .decline-btn, .end-call-btn {
          padding: 14px 28px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          min-width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .call-btn {
          background: #48bb78;
          color: white;
        }
        
        .answer-btn {
          background: #48bb78;
          color: white;
        }
        
        .decline-btn {
          background: #f56565;
          color: white;
        }
        
        .end-call-btn {
          background: #f56565;
          color: white;
          padding: 12px 32px;
          font-weight: bold;
        }
        
        .call-btn:hover, .answer-btn:hover, .decline-btn:hover, .end-call-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        .call-btn:disabled, .answer-btn:disabled, .decline-btn:disabled, .end-call-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .incoming-call-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        
        .modal-header {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
          z-index: 10;
        }
        
        .modal-minimize {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: white;
          padding: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-minimize:hover {
          background: rgba(59, 130, 246, 0.8);
          transform: scale(1.1);
        }
        
        .modal-close {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: white;
          padding: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .minimized-call {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 2000;
          animation: slideInFromRight 0.3s ease-out;
        }
        
        .minimized-content {
          background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
          border-radius: 16px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.2);
          min-width: 220px;
          backdrop-filter: blur(8px);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .minimized-content:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        }
        
        .minimized-info {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
        }
        
        .minimized-icon {
          font-size: 20px;
          animation: pulse 2s infinite;
        }
        
        .minimized-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .minimized-user {
          font-size: 13px;
          font-weight: 600;
          color: white;
        }
        
        .minimized-timer {
          font-size: 11px;
          color: #10b981;
          font-weight: 500;
        }
        
        .minimized-controls {
          display: flex;
          gap: 6px;
        }
        
        .minimize-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        
        .minimize-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }
        
        .minimize-btn.end-call:hover {
          background: rgba(239, 68, 68, 0.8);
        }
        
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoCall;