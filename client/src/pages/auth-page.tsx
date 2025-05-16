import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // 이미 로그인한 경우 홈으로 리다이렉트
  if (user) {
    return <Redirect to="/" />;
  }

  // 로그인 처리 함수
  const handleReplitLogin = () => {
    // Replit OAuth 로그인을 위한 API 라우트로 이동
    window.location.href = '/api/login';
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* 로그인 폼 영역 */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Lexitra</h1>
            <p className="text-muted-foreground">특허 문서 전문 번역 플랫폼</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>로그인</CardTitle>
              <CardDescription>
                Replit 계정으로 간편하게 로그인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleReplitLogin}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Replit로 로그인
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">안전하고 쉬운 로그인</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-center text-muted-foreground">
                    <p>Replit 계정으로 로그인하면 별도의 회원가입 없이 바로 서비스를 이용할 수 있습니다.</p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="text-sm text-muted-foreground text-center w-full">
                로그인 시 <a href="/terms" className="underline hover:text-primary">이용약관</a>과 <a href="/privacy" className="underline hover:text-primary">개인정보 처리방침</a>에 동의하게 됩니다.
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* 소개 영역 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary to-primary-400 text-white flex-col justify-center p-12">
        <div className="max-w-lg mx-auto">
          <h2 className="text-4xl font-bold mb-6">Lexitra</h2>
          <p className="text-xl mb-8">특허 문서 번역을 위한 최적의 플랫폼</p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="rounded-full bg-white/20 p-2 mr-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">고급 AI 번역</h3>
                <p className="text-white/80">GPT 기반 기술을 활용하여 기술 문서에 최적화된 번역 제공</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-white/20 p-2 mr-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">번역 메모리(TM) 관리</h3>
                <p className="text-white/80">번역 이력을 저장하고 활용하여 일관성 있는 번역 품질 유지</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-white/20 p-2 mr-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">용어집(TB) 지원</h3>
                <p className="text-white/80">특허 용어 관리로 전문 용어의 일관성 유지</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
