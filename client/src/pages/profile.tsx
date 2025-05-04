import { MainLayout } from '@/components/layout/main-layout';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Redirect } from 'wouter';
import { Loader2, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <MainLayout title="내 프로필">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <MainLayout title="내 프로필">
      <div className="max-w-lg mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>프로필 정보</CardTitle>
            <CardDescription>
              현재 로그인된 사용자 정보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-xl">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">사용자 이름</h3>
                <p className="font-medium">{user.username}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">사용자 ID</h3>
                <p className="font-medium">{user.id}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button variant="outline" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그아웃 중...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
}
