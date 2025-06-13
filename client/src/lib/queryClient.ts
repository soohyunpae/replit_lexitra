import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Save auth token to localStorage
export function saveAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

// Remove auth token from localStorage (logout)
export function removeAuthToken(): void {
  localStorage.removeItem('auth_token');
}

export async function apiRequest(
  method: string,
  path: string,
  data?: unknown | undefined,
  options?: { 
    headers?: Record<string, string>;
    onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
  }
): Promise<Response> {
  // Create headers including Authorization with token if available
  const isFormData = data instanceof FormData;
  
  const headers: Record<string, string> = {
    ...options?.headers,
    ...(isFormData ? {} : { "Content-Type": data ? "application/json" : "text/plain" }),
    "Accept": "application/json"
  };
  
  // Add Authorization header if token exists
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // 기본 fetch 옵션
  const fetchOptions: RequestInit = {
    method,
    credentials: 'include' as RequestCredentials,  // This is critical for cookie-based auth
    mode: 'cors' as RequestMode,           // Explicitly set CORS mode
    headers,
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
  };
  
  // XMLHttpRequest 대신 fetch를 사용하되, FormData인 경우 업로드 진행률을 관리하기 위한 코드
  let response;
  if (isFormData && options?.onUploadProgress) {
    // FormData의 경우 XMLHttpRequest로 처리
    response = await new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, path);
      
      // 헤더 설정
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });
      
      // 이벤트 리스너 설정
      xhr.upload.onprogress = (e) => {
        if (options.onUploadProgress) {
          options.onUploadProgress({
            loaded: e.loaded,
            total: e.total
          });
        }
      };
      
      xhr.onload = () => {
        const responseHeaders: Record<string, string> = {};
        xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
          if (line) {
            const parts = line.split(': ');
            responseHeaders[parts[0]] = parts[1];
          }
        });
        
        resolve(new Response(xhr.response, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers(responseHeaders)
        }));
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error'));
      };
      
      // 보내기
      xhr.send(data as FormData);
    });
  } else {
    // 일반 요청은 fetch 사용
    response = await fetch(path, fetchOptions);
  }

  console.log(`API Request to ${method} ${path}:`, {
    status: response.status,
    ok: response.ok,
    hasAuthToken: !!token
  });

  await throwIfResNotOk(response);
  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Prepare headers with token if available
    const headers: Record<string, string> = {
      "Accept": "application/json"
    };
    
    // Add Authorization header if token exists
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include" as RequestCredentials, // Still include cookies for backward compatibility
      mode: "cors" as RequestMode,          // Enable CORS
      headers
    });

    console.log(`GET Query for ${queryKey[0]}:`, {
      status: res.status,
      ok: res.ok,
      hasAuthToken: !!token,
      authenticated: res.status !== 401
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      onError: (error: unknown) => {
        if (error instanceof Error) {
          console.error("Query Error:", error.message);
        } else {
          console.error("Unknown Query Error:", error);
        }
      }
    },
    mutations: {
      retry: false,
      onError: (error: unknown) => {
        if (error instanceof Error) {
          console.error("Mutation Error:", error.message);
        } else {
          console.error("Unknown Mutation Error:", error);
        }
      }
    },
  },
});