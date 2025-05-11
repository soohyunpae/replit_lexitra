import { useEffect, useRef } from 'react';

/**
 * 텍스트 영역의 내용에 따라 높이를 자동으로 조정하는 커스텀 훅
 * @param initialText 초기 텍스트
 * @returns textareaRef - 텍스트 영역에 연결할 ref
 */
export function useAutoResize(initialText: string = '') {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 텍스트 영역 높이 조정 함수
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 높이 재설정 (스크롤 높이 계산을 위해 0으로 설정)
    textarea.style.height = '0px';
    
    // 스크롤 높이 + 패딩에 따라 새 높이 설정
    const scrollHeight = textarea.scrollHeight;
    
    // 패딩 값 계산
    const style = window.getComputedStyle(textarea);
    const paddingTop = parseInt(style.paddingTop);
    const paddingBottom = parseInt(style.paddingBottom);
    
    // 최종 높이 설정 (패딩 고려)
    textarea.style.height = `${scrollHeight}px`;
  };

  // 초기 및 텍스트 변경 시 높이 조정
  useEffect(() => {
    adjustHeight();
  }, [initialText]);

  // 창 크기 변경 이벤트에 대응
  useEffect(() => {
    window.addEventListener('resize', adjustHeight);
    
    // 클린업 함수
    return () => {
      window.removeEventListener('resize', adjustHeight);
    };
  }, []);

  return { textareaRef, adjustHeight };
}