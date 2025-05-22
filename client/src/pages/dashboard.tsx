import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils";

import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

import { FileText, Upload, RefreshCw, TextCursorInput } from "lucide-react";

// 프로젝트 타입 정의
interface Project {
  id: number;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  progress?: number;
  userId?: number;
  claimedBy?: number;
}

// 리뷰 통계 타입 정의
interface ReviewStats {
  totalAwaitingReview: number;
  totalCompleted: number;
  availableProjects: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // 프로젝트 데이터 가져오기
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !!user,
  });

  // 검토 통계 데이터 가져오기
  const {
    data: reviewStats = {
      totalAwaitingReview: 0,
      totalCompleted: 0,
      availableProjects: 0,
    },
  } = useQuery<ReviewStats>({
    queryKey: ["/api/projects/review-stats"],
    enabled: !!user,
  });

  // 용어집 데이터 가져오기
  const { data: glossaryData = [] } = useQuery<any[]>({
    queryKey: ["/api/glossary/all"],
    enabled: !!user,
  });

  // 실제 데이터 계산
  const inProgressProjectCount =
    projects.filter((p) => p.status === "In Progress" || p.status === "Claimed")
      .length || 0;
  const segmentsAwaitingReview = reviewStats.totalAwaitingReview || 0;
  const availableProjects = reviewStats.availableProjects || 0;

  // 진행 중인 프로젝트 목록 (실제 데이터)
  const inProgressProjects =
    projects
      .filter((p) => p.status === "In Progress" || p.status === "Claimed")
      .slice(0, 3)
      .map((project: Project) => {
        // 실제 진행률 계산 로직 (나중에 API에서 제공될 수 있음)
        // 현재는 기본 진행률은 0으로 설정, 있다면 그대로 사용
        return {
          ...project,
          progress: project.progress || 0,
        };
      }) || [];

  // 최근 활동 데이터를 프로젝트와 리뷰 상태에서 계산
  const recentActivities = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    // 프로젝트별 최근 업데이트 활동 추출
    const activities = projects
      .filter((p) => p.updatedAt)
      .map((project) => {
        // 프로젝트 담당자 이름 설정
        let username = t("dashboard.system");
        if (project.status === "Claimed" && project.claimer) {
          username = project.claimer.username;
        }

        // 상태별 번역 키 결정
        const statusKey =
          project.status === "Completed"
            ? "dashboard.activity.completed"
            : "dashboard.activity.updated";

        return {
          user: username,
          action: t(statusKey, { project: project.name }),
          date: new Date(project.updatedAt),
          projectId: project.id,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5); // 최근 5개 활동만 표시

    return activities;
  }, [projects]);

  // 각 프로젝트별 통계 데이터 가져오기
  const [projectStatsMap, setProjectStatsMap] = useState<{
    [key: number]: any;
  }>({});

  // 프로젝트 통계 fetch 함수
  useEffect(() => {
    const fetchProjectStats = async () => {
      if (!user || inProgressProjects.length === 0) return;

      const stats: { [key: number]: any } = {};

      // 각 프로젝트의 통계 정보 가져오기
      for (const project of inProgressProjects) {
        try {
          const authToken = localStorage.getItem("auth_token");
          const response = await fetch(`/api/projects/${project.id}/stats`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            stats[project.id] = data;
          } else {
            // 실패시 기본 데이터 사용
            stats[project.id] = {
              reviewedPercentage: 0,
              statusCounts: { Reviewed: 0 },
              totalSegments: 0,
            };
          }
        } catch (error) {
          console.error("Error fetching project stats:", error);
          stats[project.id] = {
            reviewedPercentage: 0,
            statusCounts: { Reviewed: 0 },
            totalSegments: 0,
          };
        }
      }

      setProjectStatsMap(stats);
    };

    fetchProjectStats();
  }, [user, inProgressProjects]);

  // 진행 중인 프로젝트 목록 (실제 데이터가 없을 경우 샘플 데이터 사용)
  const displayProjects = inProgressProjects.map((project) => {
    const stats = projectStatsMap[project.id] || {
      reviewedPercentage: 0,
      statusCounts: { Reviewed: 0 },
      totalSegments: 0,
    };

    // 나중에 API에서 직접 reviewedPercentage를 제공하면 그걸 사용하도록 함
    const progress =
      stats.reviewedPercentage ||
      (stats.totalSegments > 0
        ? Math.round(
            ((stats.statusCounts?.Reviewed || 0) / stats.totalSegments) * 100,
          )
        : 0);

    return {
      ...project,
      progress,
    };
  });

  return (
    <MainLayout>
      <main className="px-6 py-10 max-w-7xl mx-auto">
        {/* 요약 카드 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-white">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold mb-1">
                📁 {inProgressProjectCount}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("dashboard.inProgressProjects")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold mb-1">
                📝 {segmentsAwaitingReview}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("dashboard.segmentsAwaitingReview")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold mb-1">
                🔍 {availableProjects}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("dashboard.projectsAvailableToClaim")}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 액션 카드 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 진행 중인 리뷰 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {t("dashboard.reviewInProgress")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {displayProjects.length > 0 ? (
                  displayProjects.map((project: Project) => (
                    <li
                      key={project.id}
                      className="border rounded-lg px-4 py-3"
                    >
                      <div className="font-bold">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.sourceLanguage} → {project.targetLanguage} ·{" "}
                        {project.progress}% {t("translation.statusReviewed")}
                      </div>
                      <Link href={`/projects/${project.id}`}>
                        <Button
                          variant="link"
                          className="mt-2 px-0 text-blue-600 hover:underline text-sm"
                        >
                          {t("dashboard.continueReviewing")} →
                        </Button>
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-center py-4 text-muted-foreground">
                    {t("dashboard.noReviewsInProgress")}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* 용어집 + TM 업데이트 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {t("dashboard.recentActivity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-3 text-gray-700">
                {recentActivities.map((activity) => (
                  <li key={activity.projectId}>
                    📌 <strong>{activity.user}</strong>{" "}
                    <Link href={`/projects/${activity.projectId}`}>
                      <span className="text-blue-600 hover:underline">
                        {activity.action}
                      </span>
                    </Link>{" "}
                    ({new Date(activity.date).toLocaleDateString("en-US")})
                  </li>
                ))}
                {recentActivities.length === 0 && (
                  <li className="text-center text-muted-foreground">
                    {t("dashboard.noRecentActivity")}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* 빠른 액세스 */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold mb-4">
            {t("dashboard.quickAccess")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-2">
                  📂 {t("dashboard.viewAllProjects")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.accessProjectsDescription")}
                </p>
                <Link href="/projects">
                  <Button
                    variant="link"
                    className="mt-3 px-0 text-blue-600 text-sm hover:underline"
                  >
                    {t("dashboard.goToProjects")} →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-2">
                  📘 {t("dashboard.manageGlossary")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.editTermsDescription")}
                </p>
                <Link href="/glossaries">
                  <Button
                    variant="link"
                    className="mt-3 px-0 text-blue-600 text-sm hover:underline"
                  >
                    {t("dashboard.openGlossary")} →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-2">
                  🧠 {t("dashboard.translationMemory")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.tmDescription")}
                </p>
                <Link href="/tm">
                  <Button
                    variant="link"
                    className="mt-3 px-0 text-blue-600 text-sm hover:underline"
                  >
                    {t("dashboard.viewTM")} →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-sm text-center py-6 text-muted-foreground">
        © 2025 Lexitra. Built for the new era of translation.
      </footer>
    </MainLayout>
  );
}
