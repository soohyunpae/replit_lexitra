import { useEffect, useState, useRef, useCallback } from 'react';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface UseWebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectOnClose?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface FileProgressMessage {
  type: 'file_progress';
  data: {
    projectId: number;
    filename: string;
    status: 'processing' | 'completed' | 'error';
    progress: number;
    message?: string;
  };
}

type WebSocketMessage = FileProgressMessage | { type: string; [key: string]: any };

/**
 * WebSocket 연결을 관리하는 훅
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [fileProgress, setFileProgress] = useState<Record<string, FileProgressMessage['data']>>({});
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  const {
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnectOnClose = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;
  
  // 서버로 메시지 전송 함수
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // 연결 초기화 함수
  const connect = useCallback(() => {
    // 기존 연결이 있다면 정리
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    try {
      // WebSocket 서버 URL 결정 (HTTP/HTTPS에 따라 ws/wss 결정)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket server:', wsUrl);
      setStatus('connecting');
      
      // WebSocket 인스턴스 생성
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      
      // 이벤트 핸들러 설정
      socket.onopen = (event) => {
        console.log('WebSocket connection established');
        setStatus('open');
        reconnectAttemptsRef.current = 0;
        if (onOpen) onOpen(event);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // 마지막 메시지 및 메시지 이력 업데이트
          setLastMessage(data);
          setMessages((prev) => [...prev, data]);
          
          // 파일 진행 상황 메시지 처리
          if (data.type === 'file_progress') {
            setFileProgress((prev) => ({
              ...prev,
              [data.data.filename]: data.data
            }));
          }
          
          if (onMessage) onMessage(event);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket connection closed');
        setStatus('closed');
        
        if (onClose) onClose(event);
        
        // 자동 재연결 처리
        if (reconnectOnClose && reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
          if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectInterval);
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setStatus('error');
        if (onError) onError(event);
      };
    } catch (err) {
      console.error('Error establishing WebSocket connection:', err);
      setStatus('error');
    }
  }, [onOpen, onMessage, onClose, onError, reconnectOnClose, reconnectInterval, maxReconnectAttempts]);
  
  // 첫 마운트 시 연결 시작 및 언마운트 시 정리
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
  // 수동 재연결 함수
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);
  
  return {
    status,
    messages,
    lastMessage,
    fileProgress,
    sendMessage,
    reconnect,
    // isReady 속성 추가하여 간편하게 상태 확인 가능
    isReady: status === 'open'
  };
}

export default useWebSocket;