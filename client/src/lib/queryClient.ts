import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  path: string,
  data?: unknown | undefined,
): Promise<Response> {
  const response = await fetch(path, {
    method,
    credentials: 'include',  // Include cookies in cross-origin requests
    mode: 'cors',           // Explicitly set CORS mode
    headers: {
      "Content-Type": data ? "application/json" : "text/plain",
      "Accept": "application/json"
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  console.log(`API Request to ${method} ${path}:`, {
    status: response.status,
    ok: response.ok,
    hasCookieHeader: !!response.headers.get('set-cookie')
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
    const res = await fetch(queryKey[0] as string, {
      credentials: "include", // Include cookies
      mode: "cors",          // Enable CORS
      headers: {
        "Accept": "application/json"
      }
    });

    console.log(`GET Query for ${queryKey[0]}:`, {
      status: res.status,
      ok: res.ok,
      hasCookieHeader: !!res.headers.get('set-cookie'),
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