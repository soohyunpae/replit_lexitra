import { MainLayout } from '@/components/layout/main-layout';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Redirect } from 'wouter';
import { Loader2, LogOut, User, Mail, Shield, Clock, FileText, Activity } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // 프로젝트 통계 가져오기 (실패해도 무시)
  const { data: projectStats } = useQuery({
    queryKey: ['/api/projects/stats/user'],
    enabled: !!user,
  });

  // 로그아웃 처리 함수
  const handleLogout = () => {
    // Replit OAuth 로그아웃을 위한 API 라우트로 이동
    window.location.href = '/api/logout';
  };

  if (isLoading) {
    return (
      <MainLayout title="내 프로필">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // 사용자 역할에 따른 뱃지 스타일 결정
  const getRoleBadge = (role: string = 'user') => {
    switch(role) {
      case 'admin':
        return <Badge variant="destructive">관리자</Badge>;
      case 'translator':
        return <Badge variant="secondary">번역사</Badge>;
      case 'reviewer':
        return <Badge variant="outline">검수자</Badge>;
      default:
        return <Badge variant="default">일반 사용자</Badge>;
    }
  };

  return (
    <MainLayout title="내 프로필">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">내 프로필</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 사용자 정보 카드 */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>사용자 정보</CardTitle>
              <CardDescription>
                계정 정보 및 역할
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center">
                {user.profileImageUrl ? (
                  <Avatar className="w-24 h-24 border-4 border-primary/20">
                    <AvatarImage src={user.profileImageUrl} alt={user.username || "사용자"} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-2xl">
                    {(user.firstName?.[0] || '') + (user.lastName?.[0] || user.username?.[0] || 'U')}
                  </div>
                )}
                
                <h2 className="text-xl font-semibold mt-4">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.username}
                </h2>
                
                <div className="mt-2">
                  {getRoleBadge(user.role)}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">사용자 ID:</span>
                  <span className="ml-auto font-medium">{user.id}</span>
                </div>
                
                {user.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">이메일:</span>
                    <span className="ml-auto font-medium truncate max-w-[180px]" title={user.email}>
                      {user.email}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">역할:</span>
                  <span className="ml-auto font-medium">
                    {user.role === 'admin' ? '관리자' : 
                     user.role === 'translator' ? '번역사' : 
                     user.role === 'reviewer' ? '검수자' : '일반 사용자'}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </CardFooter>
          </Card>
          
          {/* 활동 통계 카드 */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>활동 통계</CardTitle>
              <CardDescription>
                번역 활동 및 프로젝트 통계
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 번역 통계 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-primary" />
                    번역 활동
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {projectStats?.totalProjects || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">프로젝트</div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {projectStats?.totalSegments || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">세그먼트</div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {projectStats?.completedSegments || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">완료</div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {projectStats?.wordCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">단어 수</div>
                    </div>
                  </div>
                </div>
                
                {/* 최근 활동 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-primary" />
                    최근 활동
                  </h3>
                  
                  {projectStats?.recentActivities?.length > 0 ? (
                    <div className="space-y-3">
                      {projectStats.recentActivities.map((activity: any, idx: number) => (
                        <div key={idx} className="flex items-center p-3 bg-muted/50 rounded-lg">
                          <div className="mr-3 text-lg">
                            {activity.type === 'translation' ? '🔤' : 
                             activity.type === 'review' ? '✅' : 
                             activity.type === 'comment' ? '💬' : '📝'}
                          </div>
                          <div>
                            <div className="text-sm">{activity.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      아직 활동 기록이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
