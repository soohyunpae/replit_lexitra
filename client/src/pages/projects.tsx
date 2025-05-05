
import React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function ProjectsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    }
  });

  const filteredProjects = projects.filter(project => {
    if (statusFilter === "all") return true;
    const status = getProjectStatus(project, user?.id);
    return status === statusFilter;
  });

  function getProjectStatus(project: any, userId: string | undefined) {
    if (project.status === "completed") return "completed";
    if (!project.claimedBy) return "not_started";
    if (project.claimedBy === userId) return "in_progress";
    return "taken";
  }

  function getStatusBadge(status: string) {
    const badges = {
      not_started: <span className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 px-2 py-0.5 rounded-full">Not Started</span>,
      in_progress: <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">In Progress</span>,
      taken: <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full">Taken</span>,
      completed: <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">Completed</span>
    };
    return badges[status as keyof typeof badges];
  }

  function getProgress(project: any) {
    const total = project.files?.reduce((acc: number, file: any) => acc + (file.segments?.length || 0), 0) || 0;
    const completed = project.files?.reduce((acc: number, file: any) => 
      acc + (file.segments?.filter((s: any) => s.status === 'reviewed' || s.status === 'completed').length || 0), 0) || 0;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>View and manage translation projects</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="taken">Taken</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center rounded-md border">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="px-2.5"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="px-2.5"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "list" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Language Pair</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project: any) => {
                    const status = getProjectStatus(project, user?.id);
                    const canAccess = status === "not_started" || status === "in_progress" || user?.role === "admin";
                    const progress = getProgress(project);

                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          {canAccess ? (
                            <Link 
                              to={`/projects/${project.id}`}
                              className="text-primary hover:underline"
                            >
                              {project.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{project.name}</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell>{project.sourceLanguage} → {project.targetLanguage}</TableCell>
                        <TableCell>{progress}%</TableCell>
                        <TableCell>{formatDate(project.updatedAt || project.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project: any) => {
                  const status = getProjectStatus(project, user?.id);
                  const canAccess = status === "not_started" || status === "in_progress" || user?.role === "admin";

                  return (
                    <Card key={project.id}>
                      <CardHeader className="relative">
                        <div className="absolute top-4 right-4">
                          {getStatusBadge(status)}
                        </div>
                        {canAccess ? (
                          <Link to={`/projects/${project.id}`}>
                            <CardTitle className="text-lg hover:underline cursor-pointer">
                              {project.name}
                            </CardTitle>
                          </Link>
                        ) : (
                          <CardTitle className="text-lg text-muted-foreground">
                            {project.name}
                          </CardTitle>
                        )}
                        <CardDescription>{project.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          Last updated: {formatDate(project.updatedAt || project.createdAt)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
