import { useState, useEffect, useRef, useCallback } from 'react';

export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface UseWebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (data: any) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onReconnect?: () => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  protocols?: string | string[];
}

/**
 * Custom hook for managing WebSocket connections with reconnection support
 */
export const useWebSocket = (
  url: string | null,
  options: UseWebSocketOptions = {}
) => {
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manuallyClosedRef = useRef(false);
  
  const {
    onOpen,
    onMessage,
    onClose,
    onError,
    onReconnect,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    protocols
  } = options;
  
  // Message queue for messages sent while socket is not connected
  const messageQueueRef = useRef<any[]>([]);

  const connect = useCallback(() => {
    // Reset manually closed flag when connecting
    manuallyClosedRef.current = false;
    
    if (!url) {
      setStatus('closed');
      return;
    }
    
    // Clean up existing socket if there is one
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    try {
      setStatus('connecting');
      const socket = new WebSocket(url, protocols);
      socketRef.current = socket;
      
      socket.onopen = (event) => {
        setStatus('open');
        reconnectCountRef.current = 0;
        
        // Process any queued messages
        if (messageQueueRef.current.length > 0) {
          messageQueueRef.current.forEach((msg) => {
            socket.send(JSON.stringify(msg));
          });
          messageQueueRef.current = [];
        }
        
        if (onOpen) onOpen(event);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setLastMessage(event.data);
          if (onMessage) onMessage(event.data);
        }
      };
      
      socket.onclose = (event) => {
        setStatus('closed');
        if (onClose) onClose(event);
        
        // Attempt to reconnect if not manually closed and within reconnect attempts
        if (
          !manuallyClosedRef.current && 
          reconnectCountRef.current < reconnectAttempts
        ) {
          reconnectCountRef.current += 1;
          
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }
          
          reconnectTimerRef.current = setTimeout(() => {
            if (onReconnect) onReconnect();
            connect();
          }, reconnectInterval);
        }
      };
      
      socket.onerror = (event) => {
        setStatus('error');
        if (onError) onError(event);
        
        // Don't attempt to reconnect on error, let onclose handle it
        console.error('WebSocket connection error:', event);
      };
    } catch (error) {
      setStatus('error');
      console.error('Error creating WebSocket:', error);
    }
  }, [url, protocols, onOpen, onMessage, onClose, onError, onReconnect, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    manuallyClosedRef.current = true;
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setStatus('closed');
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      // Queue message for when connection is established
      messageQueueRef.current.push(message);
      return false;
    }
  }, []);

  // Connect when the component mounts or url changes
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, url]);

  return {
    sendMessage,
    lastMessage,
    status,
    connect,
    disconnect
  };
};