import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, saveAuthToken, removeAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation<User & { token?: string }, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      // Extract token from response if exists
      const { token, ...user } = data;
      
      // Save token to localStorage if it exists
      if (token) {
        saveAuthToken(token);
      }
      
      // Update user data in query cache
      queryClient.setQueryData(["/api/user"], user);
      
      toast({
        title: "로그인 성공",
        description: `${user.username}님, 환영합니다.`,
      });
    },
    onError: (error) => {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<User & { token?: string }, Error, RegisterData>({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      // Extract token from response if exists
      const { token, ...user } = data;
      
      // Save token to localStorage if it exists
      if (token) {
        saveAuthToken(token);
      }
      
      // Update user data in query cache
      queryClient.setQueryData(["/api/user"], user);
      
      toast({
        title: "회원가입 성공",
        description: `${user.username}님, 환영합니다.`,
      });
    },
    onError: (error) => {
      toast({
        title: "회원가입 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        // Make the logout request
        const response = await apiRequest("POST", "/api/logout");
        
        // Even if server doesn't respond properly, we should clean up client-side
        if (!response.ok) {
          console.warn("Server returned non-OK response for logout:", response.status);
        }
        
        return;
      } catch (error) {
        console.error("Logout request failed, cleaning up client-side anyway:", error);
        // Continue to onSuccess even if the request fails
        // We want to clear local auth state regardless of server response
        return;
      }
    },
    onSuccess: () => {
      // Remove token from localStorage
      removeAuthToken();
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Force a refetch of any protected routes to confirm logout
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "로그아웃 성공",
        description: "로그아웃 되었습니다.",
      });
      
      // Redirect to homepage on successful logout
      window.location.href = '/';
    },
    onError: (error) => {
      console.error("Logout error:", error);
      
      // Clean up client side anyway even if server response fails
      removeAuthToken();
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "로그아웃에 문제가 있었지만 처리되었습니다",
        description: "다시 로그인해주세요.",
      });
      
      // Redirect to homepage
      window.location.href = '/';
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
