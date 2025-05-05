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
  options?: { headers?: Record<string, string> }
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
  
  const response = await fetch(path, {
    method,
    credentials: 'include',  // Still include cookies for backward compatibility
    mode: 'cors',           // Explicitly set CORS mode
    headers,
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
  });

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
      credentials: "include", // Still include cookies for backward compatibility
      mode: "cors",          // Enable CORS
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});