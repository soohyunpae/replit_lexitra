import { useState, useEffect, useRef } from 'react';

/**
 * 값의 변경을 지연시키는 커스텀 훅
 * @param value 원본 값
 * @param delay 지연 시간 (ms)
 * @returns 지연된 값
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    // 지연 시간 후에 값 업데이트
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // 타이머 클리어 (언마운트 또는 값/지연 시간 변경 시)
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * 디바운스된 콜백 함수를 생성하는 훅
 * @param callback 실행할 콜백 함수
 * @param delay 지연 시간 (ms)
 * @param deps 의존성 배열 (콜백이 의존하는 변수들)
 * @returns 디바운스된 콜백 함수
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 디바운스된 함수 생성
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedCallback = useRef((...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    timerRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }).current;
  
  // 의존성이 변경되면 타이머 클리어
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [...deps, delay]);
  
  return debouncedCallback as T;
}