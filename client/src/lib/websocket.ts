// WebSocket connection manager for real-time collaboration

type MessageHandler = (data: any) => void;
export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface WebSocketOptions {
  projectId?: number;
  fileId?: number;
  userId?: number;
  username?: string;
  debug?: boolean;
}

export interface SegmentUpdateMessage {
  type: 'segment_update';
  segmentId: number;
  projectId: number;
  userId: number;
  username: string;
  status: string;
  target: string;
}

export interface UserJoinedMessage {
  type: 'user_joined';
  userId: number;
  username: string;
  projectId: number;
}

export interface UserLeftMessage {
  type: 'user_left';
  userId: number;
  username: string;
  projectId: number;
}

// Type guard functions for message types
export const isSegmentUpdateMessage = (data: any): data is SegmentUpdateMessage => 
  data && data.type === 'segment_update';

export const isUserJoinedMessage = (data: any): data is UserJoinedMessage => 
  data && data.type === 'user_joined';

export const isUserLeftMessage = (data: any): data is UserLeftMessage => 
  data && data.type === 'user_left';

// WebSocket connection manager singleton
class WebSocketManager {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private status: WebSocketStatus = 'closed';
  private options: WebSocketOptions = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  
  // Connect to WebSocket server
  connect(options: WebSocketOptions = {}): void {
    this.options = options;
    
    if (this.socket && this.status === 'open') {
      this.log('WebSocket already connected, sending registration');
      this.register();
      return;
    }
    
    // Close existing connection if any
    this.close();
    
    // Determine the WebSocket URL (ws or wss based on current protocol)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      this.log(`Connecting to WebSocket server at ${wsUrl}`);
      this.status = 'connecting';
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      this.log('Error connecting to WebSocket server:', error);
      this.status = 'error';
      this.attemptReconnect();
    }
  }
  
  // Register with the server after connection
  private register(): void {
    const { userId, username, projectId, fileId } = this.options;
    
    if (!userId || !username) {
      this.log('Cannot register without user details');
      return;
    }
    
    this.send({
      type: 'register',
      userId,
      username,
      projectId,
      fileId
    });
  }
  
  // Send message to server
  send(data: any): boolean {
    if (!this.socket || this.status !== 'open') {
      this.log('Cannot send message, socket not connected');
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      this.log('Error sending message:', error);
      return false;
    }
  }
  
  // Send segment update to server
  sendSegmentUpdate(data: Omit<SegmentUpdateMessage, 'type'>): boolean {
    return this.send({
      type: 'segment_update',
      ...data
    });
  }
  
  // Close connection
  close(): void {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      if (this.status === 'open') {
        this.socket.close();
      }
      
      this.socket = null;
    }
    
    this.status = 'closed';
    
    // Cancel any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  // Subscribe to specific message types
  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)?.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }
  
  // Get current connection status
  getStatus(): WebSocketStatus {
    return this.status;
  }
  
  // Event handlers
  private handleOpen(): void {
    this.status = 'open';
    this.reconnectAttempts = 0;
    this.log('WebSocket connection established');
    
    // Register with the server
    this.register();
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.log('Received message:', data);
      
      if (!data.type) {
        this.log('Message has no type');
        return;
      }
      
      // Call all handlers for this message type
      const handlers = this.messageHandlers.get(data.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            this.log('Error in message handler:', error);
          }
        });
      }
      
      // Call all handlers for '*' (any message)
      const anyHandlers = this.messageHandlers.get('*');
      if (anyHandlers) {
        anyHandlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            this.log('Error in wildcard message handler:', error);
          }
        });
      }
    } catch (error) {
      this.log('Error parsing message:', error);
    }
  }
  
  private handleClose(event: CloseEvent): void {
    this.status = 'closed';
    this.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    
    // Attempt to reconnect if not closed cleanly
    if (event.code !== 1000) {
      this.attemptReconnect();
    }
  }
  
  private handleError(event: Event): void {
    this.status = 'error';
    this.log('WebSocket error:', event);
    
    // Will likely be followed by a close event
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Maximum reconnect attempts reached');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    this.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(this.options);
    }, delay);
  }
  
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log('[WebSocket]', ...args);
    }
  }
}

// Export singleton instance
export const websocket = new WebSocketManager();