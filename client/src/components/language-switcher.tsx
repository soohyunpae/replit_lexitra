import React from 'react';
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

/**
 * 언어 전환을 위한 독립적인 컴포넌트
 * 리액트 상태와 관계없이 직접 언어를 전환합니다.
 */
export function LanguageSwitcher() {
  // 현재 언어 확인
  const currentLanguage = localStorage.getItem("lexitra-language-preference") || "en";
  
  // 언어 전환 함수
  const switchLanguage = () => {
    // 현재 언어 확인 및 전환할 언어 결정
    const newLanguage = currentLanguage === "en" ? "ko" : "en";
    
    // localStorage에 새 언어 설정 저장
    localStorage.setItem("lexitra-language-preference", newLanguage);
    
    // HTML lang 속성 변경
    document.documentElement.lang = newLanguage;
    
    // 현재 URL에 언어 파라미터를 추가하여 페이지 새로고침
    const separator = window.location.href.includes('?') ? '&' : '?';
    window.location.href = `${window.location.href}${separator}_lang=${newLanguage}&_ts=${Date.now()}`;
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={switchLanguage}
      className="flex items-center justify-center"
    >
      <Globe className="h-4 w-4 mr-2" />
      <span>{currentLanguage === "en" ? "한국어로 전환" : "Switch to English"}</span>
    </Button>
  );
}