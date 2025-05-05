import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

type ApiResponse = {
  status: number;
  statusText: string;
  data: any;
  cookies: string | null;
  headers: Record<string, string>;
};

export default function AuthDebugPage() {
  const { user, loginMutation, logoutMutation } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, ApiResponse>>({});
  const [browserCookies, setBrowserCookies] = useState<string>('');
  
  // Get browser cookies
  useEffect(() => {
    setBrowserCookies(document.cookie);
  }, []);

  // Test API endpoints
  const testEndpoint = async (name: string, url: string, method: string = 'GET', body?: any) => {
    try {
      // Special settings for Replit environment
      const options: RequestInit = {
        method,
        credentials: 'include', // Include cookies in the request
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Mode: 'cors' to allow cookies to be sent
        mode: 'cors'
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json().catch(() => ({}));
      
      // Get response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      setTestResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          statusText: response.statusText,
          data,
          cookies: document.cookie,
          headers
        }
      }));

      // Update cookies after request
      setBrowserCookies(document.cookie);

      return { success: response.ok, data };
    } catch (error) {
      console.error(`Error testing ${name}:`, error);
      setTestResults(prev => ({
        ...prev,
        [name]: {
          status: 0,
          statusText: 'Network Error',
          data: { error: error instanceof Error ? error.message : String(error) },
          cookies: document.cookie,
          headers: {}
        }
      }));
      return { success: false, error };
    }
  };

  const runAllTests = async () => {
    await testEndpoint('user', '/api/user');
    await testEndpoint('login', '/api/login', 'POST', { username: 'test', password: 'password' });
    await testEndpoint('user-after-login', '/api/user');
  };

  const testLoginAndProfile = async () => {
    const loginResult = await testEndpoint('manual-login', '/api/login', 'POST', { username: 'test', password: 'password' });
    if (loginResult.success) {
      await testEndpoint('profile-after-login', '/api/profile');
    }
  };

  const clearTests = () => {
    setTestResults({});
  };

  const handleLoginMutation = () => {
    loginMutation.mutate({ username: 'test', password: 'password' });
  };

  const handleLogout = async () => {
    await testEndpoint('logout', '/api/logout', 'POST');
    await testEndpoint('user-after-logout', '/api/user');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Authentication Debugging</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Current Authentication State</CardTitle>
            <CardDescription>Information about the current user session</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <p><strong>Authenticated:</strong> Yes</p>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Role:</strong> {user.role || 'Not set'}</p>
              </div>
            ) : (
              <p>Not authenticated</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Browser Cookies</CardTitle>
            <CardDescription>Cookies currently stored in the browser</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-md overflow-x-auto max-h-[150px] overflow-y-auto">
              <pre className="text-xs">
                {browserCookies || 'No cookies found'}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap gap-3">
          <Button onClick={runAllTests}>Run All Tests</Button>
          <Button onClick={() => testEndpoint('user', '/api/user')} variant="outline">Test /api/user</Button>
          <Button onClick={testLoginAndProfile} variant="outline">Test Login & Profile</Button>
          <Button onClick={handleLoginMutation} variant="outline">Login via Mutation</Button>
          <Button onClick={handleLogout} variant="outline">Test Logout</Button>
          <Button onClick={clearTests} variant="secondary">Clear Results</Button>
        </div>

        <Alert>
          <AlertTitle>Debugging Information</AlertTitle>
          <AlertDescription>
            This page helps debug authentication issues by testing various API endpoints and analyzing responses.
          </AlertDescription>
        </Alert>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Test Results</h2>
        
        {Object.keys(testResults).length === 0 ? (
          <div className="text-muted-foreground">No tests run yet. Click on a test button above.</div>
        ) : (
          Object.entries(testResults).map(([name, result]) => (
            <Card key={name} className={result.status >= 200 && result.status < 300 ? 'border-green-500' : 'border-red-500'}>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>{name}</span>
                  <span className={result.status >= 200 && result.status < 300 ? 'text-green-500' : 'text-red-500'}>
                    {result.status} {result.statusText}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Response Data</h3>
                    <div className="bg-muted p-3 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold mb-2">Response Headers</h3>
                    <div className="bg-muted p-3 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(result.headers, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold mb-2">Cookies After Request</h3>
                    <div className="bg-muted p-3 rounded-md overflow-x-auto max-h-[100px] overflow-y-auto">
                      <pre className="text-xs">
                        {result.cookies || 'No cookies'}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}