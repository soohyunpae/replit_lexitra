import { useEffect, useRef, useState, useCallback } from 'react';
import { websocket, WebSocketStatus } from '@/lib/websocket';
import { useAuth } from '@/hooks/use-auth';

interface UseWebSocketOptions {
  projectId?: number;
  fileId?: number;
  debug?: boolean;
  onUserJoined?: (userId: number, username: string) => void;
  onUserLeft?: (userId: number, username: string) => void;
  onSegmentUpdated?: (segmentId: number, userId: number, username: string, status: string, target: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [status, setStatus] = useState<WebSocketStatus>(websocket.getStatus());
  const { user } = useAuth();
  const optionsRef = useRef(options);
  
  // Keep optionsRef updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  
  // Set up event handlers
  useEffect(() => {
    // Function to check and update status
    const checkStatus = () => {
      const currentStatus = websocket.getStatus();
      setStatus(currentStatus);
      return currentStatus;
    };
    
    // Status check interval
    const statusInterval = setInterval(checkStatus, 5000);
    
    // Event handlers
    const handleUserJoined = (data: any) => {
      if (data.userId !== user?.id && optionsRef.current.onUserJoined) {
        optionsRef.current.onUserJoined(data.userId, data.username);
      }
    };
    
    const handleUserLeft = (data: any) => {
      if (data.userId !== user?.id && optionsRef.current.onUserLeft) {
        optionsRef.current.onUserLeft(data.userId, data.username);
      }
    };
    
    const handleSegmentUpdated = (data: any) => {
      if (data.userId !== user?.id && optionsRef.current.onSegmentUpdated) {
        optionsRef.current.onSegmentUpdated(
          data.segmentId,
          data.userId,
          data.username,
          data.status,
          data.target
        );
      }
    };
    
    // Subscribe to events
    const unsubUserJoined = websocket.subscribe('user_joined', handleUserJoined);
    const unsubUserLeft = websocket.subscribe('user_left', handleUserLeft);
    const unsubSegmentUpdated = websocket.subscribe('segment_updated', handleSegmentUpdated);
    
    // Initial status check
    checkStatus();
    
    return () => {
      clearInterval(statusInterval);
      unsubUserJoined();
      unsubUserLeft();
      unsubSegmentUpdated();
    };
  }, [user?.id]);
  
  // Connect to WebSocket when user or project changes
  useEffect(() => {
    if (user) {
      websocket.connect({
        userId: user.id,
        username: user.username,
        projectId: options.projectId,
        fileId: options.fileId,
        debug: options.debug,
      });
    }
    
    // No need to disconnect on cleanup - we keep a persistent connection
  }, [user, options.projectId, options.fileId, options.debug]);
  
  // Send segment update
  const sendSegmentUpdate = useCallback((segmentId: number, status: string, target: string) => {
    if (!user || !options.projectId) return false;
    
    return websocket.sendSegmentUpdate({
      segmentId,
      projectId: options.projectId,
      userId: user.id,
      username: user.username,
      status,
      target,
    });
  }, [user, options.projectId]);
  
  return {
    status,
    connected: status === 'open',
    sendSegmentUpdate,
  };
}