import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Edit, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Template {
  id: number;
  name: string;
  description: string;
  docxFilePath: string;
  useCount: number;
  createdAt: string;
  createdBy: number;
  placeholderData?: {
    placeholders: string[];
    htmlPreview: string;
  };
}

interface TemplateField {
  id: number;
  templateId: number;
  placeholder: string;
  fieldType: string;
  description: string;
  isRequired: boolean;
  isTranslatable: boolean;
  orderIndex: number;
  sampleContent?: string;
}

export default function TemplateManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // 새 템플릿 업로드 상태
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // 템플릿 목록 불러오기
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/admin/templates", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setError("템플릿 목록을 불러오는 중 오류가 발생했습니다.");
      toast({
        variant: "destructive",
        title: "오류",
        description: "템플릿 목록을 불러올 수 없습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 템플릿 상세 정보 불러오기
  const fetchTemplateDetails = async (templateId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch template details: ${response.status}`);
      }

      const data = await response.json();
      setSelectedTemplate(data.template);
      setTemplateFields(data.fields || []);
    } catch (error) {
      console.error("Error fetching template details:", error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "템플릿 상세 정보를 불러올 수 없습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 템플릿 업로드
  const handleUploadTemplate = async () => {
    if (!uploadFile || !uploadName) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "파일과 템플릿 이름을 입력해주세요.",
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("template", uploadFile);
      formData.append("name", uploadName);
      formData.append("description", uploadDescription);

      const response = await fetch("/api/admin/templates", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: "성공",
        description: "템플릿이 성공적으로 업로드되었습니다.",
      });

      // 폼 초기화
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
      setIsUploadDialogOpen(false);
      
      // 템플릿 목록 새로고침
      fetchTemplates();
    } catch (error) {
      console.error("Error uploading template:", error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "템플릿 업로드 중 오류가 발생했습니다.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 템플릿 필드 업데이트
  const handleUpdateField = async (fieldId: number, updates: Partial<TemplateField>) => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/admin/templates/${selectedTemplate.id}/fields/${fieldId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      toast({
        title: "성공",
        description: "필드가 성공적으로 업데이트되었습니다.",
      });

      // 템플릿 상세 정보 새로고침
      fetchTemplateDetails(selectedTemplate.id);
    } catch (error) {
      console.error("Error updating field:", error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "필드 업데이트 중 오류가 발생했습니다.",
      });
    }
  };

  // 템플릿 삭제
  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm("정말로 이 템플릿을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      toast({
        title: "성공",
        description: "템플릿이 성공적으로 삭제되었습니다.",
      });

      // 목록에서 삭제된 템플릿 제거
      setTemplates(templates.filter(t => t.id !== templateId));
      
      // 선택된 템플릿이 삭제된 경우 초기화
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setTemplateFields([]);
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "템플릿 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">템플릿 관리자</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 템플릿 목록 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>템플릿 목록</CardTitle>
              <CardDescription>
                등록된 템플릿을 확인하고 관리할 수 있습니다.
              </CardDescription>
            </div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  새 템플릿 업로드
                </Button>
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 템플릿 업로드</DialogTitle>
              <DialogDescription>
                DOCX 템플릿 파일을 업로드하여 새로운 템플릿을 생성합니다.
                파일에는 {"{{placeholder}}"} 형태의 마커가 포함되어야 합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-file">템플릿 파일 (.docx)</Label>
                <Input
                  id="template-file"
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setUploadFile(file);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="template-name">템플릿 이름</Label>
                <Input
                  id="template-name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="예: 계약서 템플릿"
                />
              </div>
              <div>
                <Label htmlFor="template-description">설명 (선택사항)</Label>
                <Textarea
                  id="template-description"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="템플릿에 대한 간단한 설명을 입력하세요"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsUploadDialogOpen(false)}
                disabled={isUploading}
              >
                취소
              </Button>
              <Button onClick={handleUploadTemplate} disabled={isUploading}>
                {isUploading ? "업로드 중..." : "업로드"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 템플릿 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>템플릿 목록</CardTitle>
            <CardDescription>
              등록된 템플릿을 확인하고 관리할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && templates.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">템플릿을 불러오는 중...</div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-2 text-sm text-muted-foreground">
                  등록된 템플릿이 없습니다.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => fetchTemplateDetails(template.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description || "설명 없음"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            사용 횟수: {template.useCount}
                          </Badge>
                          <Badge variant="outline">
                            필드: {template.placeholderData?.placeholders?.length || 0}개
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchTemplateDetails(template.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 템플릿 상세 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>템플릿 상세</CardTitle>
            <CardDescription>
              선택한 템플릿의 필드를 확인하고 설정을 변경할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTemplate ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">
                  템플릿을 선택하여 상세 정보를 확인하세요.
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">{selectedTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description || "설명 없음"}
                  </p>
                </div>

                {templateFields.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium mb-3">템플릿 필드</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>필드명</TableHead>
                          <TableHead>타입</TableHead>
                          <TableHead>번역 대상</TableHead>
                          <TableHead>필수</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templateFields.map((field) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {"{{" + field.placeholder + "}}"}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{field.fieldType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={field.isTranslatable}
                                onCheckedChange={(checked) =>
                                  handleUpdateField(field.id, { isTranslatable: checked })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={field.isRequired}
                                onCheckedChange={(checked) =>
                                  handleUpdateField(field.id, { isRequired: checked })
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground">
                      이 템플릿에는 필드가 없습니다.
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}