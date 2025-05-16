import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
};

interface ReplitUserResponse {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  username?: string;
  role?: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<ReplitUserResponse | null, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5분 동안 캐싱
  });

  // 로그인 상태를 확인하는 부울 값
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 인증 관련 정보와 함수들에 접근하기 위한 훅
 * 
 * ```tsx
 * const { user, isLoading, isAuthenticated } = useAuth();
 * 
 * if (isLoading) return <Loader />;
 * if (!isAuthenticated) return <Redirect to="/auth" />;
 * 
 * return <div>환영합니다, {user?.firstName || user?.username}님!</div>;
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
