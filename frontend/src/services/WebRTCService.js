import socketService from './socketService';
import { SOCKET_EVENTS } from '../config/constants';

class WebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.dataChannels = new Map();
    this.pingIntervals = new Map();
    this.voicePeerConnections = new Map();
    this.pendingVoiceIceCandidates = new Map();
    this.remoteVoiceStreams = new Map();
    this.localVoiceStream = null;
    this.isVoiceMuted = false;
    this.isListenerOnly = false;
    this.onRemoteVoiceStreamsChangeCallback = null;
    this.onVoiceConnectionStateChangeCallback = null;
    this.localRoomUserId = null;
    this.onConnectionStateChangeCallback = null;
  }

  setLocalUser(roomUserId) {
    this.localRoomUserId = roomUserId;
    console.log(`[WebRTCService] Local user initialized: ${roomUserId}`);
  }

  setOnConnectionStateChange(callback) {
    this.onConnectionStateChangeCallback = callback;
  }

  setOnRemoteVoiceStreamsChange(callback) {
    this.onRemoteVoiceStreamsChangeCallback = callback;
  }

  setOnVoiceConnectionStateChange(callback) {
    this.onVoiceConnectionStateChangeCallback = callback;
  }

  /**
   * Get or create a peer connection for a target user
   */
  getOrCreatePeerConnection(targetRoomUserId) {
    if (this.peerConnections.has(targetRoomUserId)) {
      return this.peerConnections.get(targetRoomUserId);
    }

    console.log(`[WebRTCService] Creating RTCPeerConnection for target: ${targetRoomUserId}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Handle ICE gathering
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Relay ICE candidate via Socket.IO
        socketService.emit(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, {
          targetRoomUserId,
          candidate: event.candidate
        });
      }
    };

    // Monitor connection states
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTCService] Connection state with ${targetRoomUserId}: ${pc.connectionState}`);
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(targetRoomUserId, pc.connectionState);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTCService] ICE connection state with ${targetRoomUserId}: ${pc.iceConnectionState}`);
    };

    // Handle incoming data channel (for the receiver side)
    pc.ondatachannel = (event) => {
      console.log(`[WebRTCService] Received data channel from ${targetRoomUserId}:`, event.channel.label);
      this.setupDataChannel(targetRoomUserId, event.channel);
    };

    this.peerConnections.set(targetRoomUserId, pc);
    return pc;
  }

  /**
   * Set up DataChannel event listeners
   */
  setupDataChannel(targetRoomUserId, channel) {
    // Clean up any existing channel/interval for this user synchronously first
    this.cleanupDataChannel(targetRoomUserId);

    channel.onopen = () => {
      console.log(`[WebRTC-DataChannel] Channel opened with ${targetRoomUserId}`);
      
      // Send initial PING
      this.sendPing(targetRoomUserId);

      // Start periodic PING every 4 seconds to demonstrate ongoing data transfer
      const intervalId = setInterval(() => {
        this.sendPing(targetRoomUserId);
      }, 4000);
      this.pingIntervals.set(targetRoomUserId, intervalId);
    };

    channel.onclose = () => {
      console.log(`[WebRTC-DataChannel] Channel closed with ${targetRoomUserId}`);
      this.cleanupDataChannel(targetRoomUserId);
    };

    channel.onerror = (error) => {
      console.error(`[WebRTC-DataChannel] Channel error with ${targetRoomUserId}:`, error);
    };

    channel.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const latency = Date.now() - payload.timestamp;
        console.log(`[WebRTC-DataChannel] Received ${payload.type.toUpperCase()} from ${targetRoomUserId} (Payload: "${payload.message}", Latency: ${latency}ms)`);
        
        if (payload.type === 'ping') {
          this.sendPong(targetRoomUserId);
        }
      } catch (err) {
        console.error(`[WebRTC-DataChannel] Error parsing message from ${targetRoomUserId}:`, err);
      }
    };

    this.dataChannels.set(targetRoomUserId, channel);
  }

  sendPing(targetRoomUserId) {
    const channel = this.dataChannels.get(targetRoomUserId);
    if (channel && channel.readyState === 'open') {
      const payload = {
        type: 'ping',
        sender: this.localRoomUserId,
        timestamp: Date.now(),
        message: `PING from ${this.localRoomUserId}`
      };
      console.log(`[WebRTC-DataChannel] Sending PING to ${targetRoomUserId}`);
      channel.send(JSON.stringify(payload));
    }
  }

  sendPong(targetRoomUserId) {
    const channel = this.dataChannels.get(targetRoomUserId);
    if (channel && channel.readyState === 'open') {
      const payload = {
        type: 'pong',
        sender: this.localRoomUserId,
        timestamp: Date.now(),
        message: `PONG reply from ${this.localRoomUserId}`
      };
      console.log(`[WebRTC-DataChannel] Sending PONG to ${targetRoomUserId}`);
      channel.send(JSON.stringify(payload));
    }
  }

  cleanupDataChannel(targetRoomUserId) {
    if (this.pingIntervals.has(targetRoomUserId)) {
      clearInterval(this.pingIntervals.get(targetRoomUserId));
      this.pingIntervals.delete(targetRoomUserId);
    }
    if (this.dataChannels.has(targetRoomUserId)) {
      const channel = this.dataChannels.get(targetRoomUserId);
      this.dataChannels.delete(targetRoomUserId);
      if (channel && channel.readyState !== 'closed') {
        try {
          channel.close();
        } catch {
          // Ignore close races from browser-managed channel teardown.
        }
      }
    }
  }

  /**
   * Initiate negotiation: Create Data Channel and send Offer
   */
  async initiateCall(targetRoomUserId) {
    try {
      console.log(`[WebRTCService] Initiating call to ${targetRoomUserId}`);
      const pc = this.getOrCreatePeerConnection(targetRoomUserId);

      // Create a data channel to force ice gathering/negotiation in the absence of media tracks
      const dc = pc.createDataChannel("vanta-data-test");
      this.setupDataChannel(targetRoomUserId, dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketService.emit(SOCKET_EVENTS.WEBRTC_OFFER, {
        targetRoomUserId,
        offer
      });
    } catch (error) {
      console.error(`[WebRTCService] Error initiating call to ${targetRoomUserId}:`, error);
    }
  }

  /**
   * Handle incoming offer from a peer
   */
  async handleOffer(senderRoomUserId, offer) {
    try {
      console.log(`[WebRTCService] Handling offer from ${senderRoomUserId}`);
      
      // If we already have a connection, close it first to reset
      if (this.peerConnections.has(senderRoomUserId)) {
        console.log(`[WebRTCService] Re-negotiating: Closing old connection with ${senderRoomUserId}`);
        this.closePeerConnection(senderRoomUserId);
      }

      const pc = this.getOrCreatePeerConnection(senderRoomUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.emit(SOCKET_EVENTS.WEBRTC_ANSWER, {
        targetRoomUserId: senderRoomUserId,
        answer
      });
    } catch (error) {
      console.error(`[WebRTCService] Error handling offer from ${senderRoomUserId}:`, error);
    }
  }

  /**
   * Handle incoming answer from a peer
   */
  async handleAnswer(senderRoomUserId, answer) {
    try {
      console.log(`[WebRTCService] Handling answer from ${senderRoomUserId}`);
      const pc = this.peerConnections.get(senderRoomUserId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } else {
        console.warn(`[WebRTCService] Received answer from ${senderRoomUserId} but no active PeerConnection found.`);
      }
    } catch (error) {
      console.error(`[WebRTCService] Error handling answer from ${senderRoomUserId}:`, error);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(senderRoomUserId, candidate) {
    try {
      const pc = this.peerConnections.get(senderRoomUserId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        console.warn(`[WebRTCService] Received ICE candidate from ${senderRoomUserId} but no active PeerConnection found.`);
      }
    } catch (error) {
      console.error(`[WebRTCService] Error adding ICE candidate from ${senderRoomUserId}:`, error);
    }
  }

  /**
   * Close a single peer connection
   */
  closePeerConnection(targetRoomUserId) {
    this.cleanupDataChannel(targetRoomUserId);
    const pc = this.peerConnections.get(targetRoomUserId);
    if (pc) {
      console.log(`[WebRTCService] Closing connection with ${targetRoomUserId}`);
      pc.close();
      this.peerConnections.delete(targetRoomUserId);
    }
  }

  /**
   * Close all active peer connections
   */
  closeAll() {
    console.log('[WebRTCService] Cleaning up all connections.');
    for (const userId of this.peerConnections.keys()) {
      this.cleanupDataChannel(userId);
      const pc = this.peerConnections.get(userId);
      if (pc) pc.close();
    }
    this.peerConnections.clear();
  }

  async startVoiceCall({ listenerOnly = false } = {}) {
    this.isListenerOnly = listenerOnly;
    this.isVoiceMuted = listenerOnly;

    if (this.localVoiceStream) {
      this.stopLocalVoiceStream();
    }

    if (!listenerOnly) {
      this.localVoiceStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      this.localVoiceStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isVoiceMuted;
      });
    }
  }

  getOrCreateVoicePeerConnection(targetRoomUserId) {
    if (this.voicePeerConnections.has(targetRoomUserId)) {
      return this.voicePeerConnections.get(targetRoomUserId);
    }

    console.log(`[WebRTC-Voice] Creating voice RTCPeerConnection for target: ${targetRoomUserId}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, {
          targetRoomUserId,
          candidate: event.candidate,
          context: 'voice'
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC-Voice] Connection state with ${targetRoomUserId}: ${pc.connectionState}`);
      if (this.onVoiceConnectionStateChangeCallback) {
        this.onVoiceConnectionStateChangeCallback(targetRoomUserId, pc.connectionState);
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      this.remoteVoiceStreams.set(targetRoomUserId, stream);
      this.notifyRemoteVoiceStreamsChanged();
    };

    this.attachLocalVoiceTracks(pc);
    this.voicePeerConnections.set(targetRoomUserId, pc);
    return pc;
  }

  attachLocalVoiceTracks(pc) {
    if (this.localVoiceStream && !this.isListenerOnly) {
      this.localVoiceStream.getAudioTracks().forEach(track => {
        const alreadyAdded = pc.getSenders().some(sender => sender.track === track);
        if (!alreadyAdded) {
          pc.addTrack(track, this.localVoiceStream);
        }
      });
      return;
    }

    const hasAudioTransceiver = pc.getTransceivers().some(
      transceiver => transceiver.receiver?.track?.kind === 'audio' || transceiver.sender?.track?.kind === 'audio'
    );
    if (!hasAudioTransceiver) {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }
  }

  notifyRemoteVoiceStreamsChanged() {
    if (!this.onRemoteVoiceStreamsChangeCallback) return;
    this.onRemoteVoiceStreamsChangeCallback(
      Array.from(this.remoteVoiceStreams.entries()).map(([roomUserId, stream]) => ({
        roomUserId,
        stream
      }))
    );
  }

  async initiateVoiceConnection(targetRoomUserId) {
    try {
      console.log(`[WebRTC-Voice] Initiating voice connection to ${targetRoomUserId}`);
      const pc = this.getOrCreateVoicePeerConnection(targetRoomUserId);
      this.attachLocalVoiceTracks(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketService.emit(SOCKET_EVENTS.WEBRTC_OFFER, {
        targetRoomUserId,
        offer,
        context: 'voice'
      });
    } catch (error) {
      console.error(`[WebRTC-Voice] Error initiating voice connection to ${targetRoomUserId}:`, error);
    }
  }

  async handleVoiceOffer(senderRoomUserId, offer) {
    try {
      console.log(`[WebRTC-Voice] Handling voice offer from ${senderRoomUserId}`);

      if (this.voicePeerConnections.has(senderRoomUserId)) {
        this.closeVoicePeerConnection(senderRoomUserId);
      }

      const pc = this.getOrCreateVoicePeerConnection(senderRoomUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await this.flushPendingVoiceIceCandidates(senderRoomUserId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.emit(SOCKET_EVENTS.WEBRTC_ANSWER, {
        targetRoomUserId: senderRoomUserId,
        answer,
        context: 'voice'
      });
    } catch (error) {
      console.error(`[WebRTC-Voice] Error handling voice offer from ${senderRoomUserId}:`, error);
    }
  }

  async handleVoiceAnswer(senderRoomUserId, answer) {
    try {
      console.log(`[WebRTC-Voice] Handling voice answer from ${senderRoomUserId}`);
      const pc = this.voicePeerConnections.get(senderRoomUserId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await this.flushPendingVoiceIceCandidates(senderRoomUserId);
      } else {
        console.warn(`[WebRTC-Voice] Received answer from ${senderRoomUserId} but no active voice PeerConnection found.`);
      }
    } catch (error) {
      console.error(`[WebRTC-Voice] Error handling voice answer from ${senderRoomUserId}:`, error);
    }
  }

  async handleVoiceIceCandidate(senderRoomUserId, candidate) {
    try {
      const pc = this.voicePeerConnections.get(senderRoomUserId);
      if (!pc) {
        this.queuePendingVoiceIceCandidate(senderRoomUserId, candidate);
        return;
      }

      if (!pc.remoteDescription) {
        this.queuePendingVoiceIceCandidate(senderRoomUserId, candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`[WebRTC-Voice] Error adding ICE candidate from ${senderRoomUserId}:`, error);
    }
  }

  queuePendingVoiceIceCandidate(senderRoomUserId, candidate) {
    const pending = this.pendingVoiceIceCandidates.get(senderRoomUserId) || [];
    pending.push(candidate);
    this.pendingVoiceIceCandidates.set(senderRoomUserId, pending);
  }

  async flushPendingVoiceIceCandidates(senderRoomUserId) {
    const pc = this.voicePeerConnections.get(senderRoomUserId);
    const pending = this.pendingVoiceIceCandidates.get(senderRoomUserId) || [];
    if (!pc || !pc.remoteDescription || pending.length === 0) return;

    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.pendingVoiceIceCandidates.delete(senderRoomUserId);
  }

  setVoiceMuted(isMuted) {
    this.isVoiceMuted = isMuted;
    if (!this.localVoiceStream) return;
    this.localVoiceStream.getAudioTracks().forEach(track => {
      track.enabled = !isMuted;
    });
  }

  stopLocalVoiceStream() {
    if (!this.localVoiceStream) return;
    this.localVoiceStream.getTracks().forEach(track => track.stop());
    this.localVoiceStream = null;
  }

  closeVoicePeerConnection(targetRoomUserId) {
    const pc = this.voicePeerConnections.get(targetRoomUserId);
    if (pc) {
      console.log(`[WebRTC-Voice] Closing voice connection with ${targetRoomUserId}`);
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          try {
            sender.replaceTrack(null);
          } catch {
            // Ignore replaceTrack races while closing the peer connection.
          }
        }
      });
      pc.close();
      this.voicePeerConnections.delete(targetRoomUserId);
    }
    this.pendingVoiceIceCandidates.delete(targetRoomUserId);
    this.remoteVoiceStreams.delete(targetRoomUserId);
    this.notifyRemoteVoiceStreamsChanged();
  }

  closeAllVoiceConnections({ stopLocalStream = true } = {}) {
    console.log('[WebRTC-Voice] Cleaning up all voice connections.');
    for (const userId of Array.from(this.voicePeerConnections.keys())) {
      this.closeVoicePeerConnection(userId);
    }
    this.voicePeerConnections.clear();
    this.pendingVoiceIceCandidates.clear();
    this.remoteVoiceStreams.clear();
    if (stopLocalStream) {
      this.stopLocalVoiceStream();
      this.isListenerOnly = false;
      this.isVoiceMuted = false;
    }
    this.notifyRemoteVoiceStreamsChanged();
  }
}

export default new WebRTCService();
