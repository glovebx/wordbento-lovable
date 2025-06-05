import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // 修正了导入语法
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { ResourceWithAttachments, Attachment } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, FileAudio, FileVideo, RefreshCw } from "lucide-react";
import { baseURL } from "@/lib/axios";

interface EditResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: ResourceWithAttachments | null;
  isSyncing: boolean,
  onReSync: (resourceId: number) => void;
  onSave: (updatedResource: Partial<ResourceWithAttachments>) => void;
}

// IMPORTANT: Replace this with your actual base URL for media files
const BASE_MEDIA_URL = `${baseURL}/api/analyze`; // Placeholder for your media base URL

export const EditResourceDialog: React.FC<EditResourceDialogProps> = ({
  open,
  onOpenChange,
  resource,
  isSyncing,
  onReSync,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    content: "",
    examType: "",
    sourceType: "url" as "url" | "article" | "pdf" | "image",
  });
  const [isSaving, setIsSaving] = useState(false);
//   const [isSyncing, setIsSyncing] = useState(false);

  // States for NEW file uploads
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newAudioPreviewUrl, setNewAudioPreviewUrl] = useState<string | null>(null);
  const [newVideoPreviewUrl, setNewVideoPreviewUrl] = useState<string | null>(null);

  // Single source of truth for AUDIO CAPTION
  const [currentAudioCaptionSrt, setCurrentAudioCaptionSrt] = useState<string>('');

  // State for the ONE existing attachment object from the resource
  const [existingAttachment, setExistingAttachment] = useState<Attachment | null>(null);

  // States for preview URLs of existing media (built from BASE_MEDIA_URL + key)
  const [existingAudioPreviewUrl, setExistingAudioPreviewUrl] = useState<string | null>(null);
  const [existingVideoPreviewUrl, setExistingVideoPreviewUrl] = useState<string | null>(null);


  const isNewRecord = resource === null;

  // Effect to initialize form data and attachment states when resource prop changes
  useEffect(() => {
    if (resource) {
      setFormData({
        content: resource.content,
        examType: resource.examType,
        sourceType: resource.sourceType,
      });

      // Find the single attachment object (if any)
      const currentAttachment = resource.attachments.length > 0 ? { ...resource.attachments[0] } : null;
      setExistingAttachment(currentAttachment); // Store the entire attachment object

      // Initialize currentAudioCaptionSrt ONLY if an audioKey exists in the attachment
      setCurrentAudioCaptionSrt(
        currentAttachment?.audioKey && currentAttachment.captionSrt
          ? currentAttachment.captionSrt
          : ''
      );

      // Generate preview URLs for existing media
      if (currentAttachment?.audioKey) {
        setExistingAudioPreviewUrl(`${BASE_MEDIA_URL}/audio/${resource.uuid}`);
      } else {
        setExistingAudioPreviewUrl(null);
      }
      if (currentAttachment?.videoKey) {
        setExistingVideoPreviewUrl(`${BASE_MEDIA_URL}/video/${resource.uuid}`);
      } else {
        setExistingVideoPreviewUrl(null);
      }

    } else {
      // Adding new record - initialize with default/empty values
      setFormData({
        content: "",
        examType: "",
        sourceType: "url",
      });
      setExistingAttachment(null);
      setExistingAudioPreviewUrl(null);
      setExistingVideoPreviewUrl(null);
      setCurrentAudioCaptionSrt(''); // Initialize audio caption for new record
    }

    // Always reset new file states when resource changes (or becomes null)
    setNewAudioFile(null);
    setNewVideoFile(null);
    setNewAudioPreviewUrl(null);
    setNewVideoPreviewUrl(null);

  }, [resource]);

  // Handler for new audio file upload
  const handleNewAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setNewAudioFile(file);
      setNewAudioPreviewUrl(URL.createObjectURL(file));
      // Do NOT modify existingAttachment or currentAudioCaptionSrt here.
      // These changes will be reconciled in handleSave.
    } else {
      toast({
        title: "文件格式错误",
        description: "请选择音频文件",
        variant: "destructive",
      });
    }
  };

  // Handler for new video file upload
  const handleNewVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setNewVideoFile(file);
      setNewVideoPreviewUrl(URL.createObjectURL(file));
      // Do NOT modify existingAttachment or currentAudioCaptionSrt here.
      // These changes will be reconciled in handleSave.
    } else {
      toast({
        title: "文件格式错误",
        description: "请选择视频文件",
        variant: "destructive",
      });
    }
  };

  // Handler to delete audio (either new or from existing attachment)
  const handleDeleteAudio = () => {
    if (newAudioFile) {
      if (newAudioPreviewUrl) URL.revokeObjectURL(newAudioPreviewUrl);
      setNewAudioFile(null);
      setNewAudioPreviewUrl(null);
    } else if (existingAttachment?.audioKey) {
      // If deleting existing audio, nullify audioKey in the existingAttachment state
      setExistingAttachment(prev => prev ? { ...prev, audioKey: null } : null);
      setExistingAudioPreviewUrl(null);
    }
    // IMPORTANT: Do NOT clear currentAudioCaptionSrt here, as per "独立，互不影响"
  };

  // Handler to delete video (either new or from existing attachment)
  const handleDeleteVideo = () => {
    if (newVideoFile) {
      if (newVideoPreviewUrl) URL.revokeObjectURL(newVideoPreviewUrl);
      setNewVideoFile(null);
      setNewVideoPreviewUrl(null);
    } else if (existingAttachment?.videoKey) {
      // If deleting existing video, nullify videoKey in the existingAttachment state
      setExistingAttachment(prev => prev ? { ...prev, videoKey: null } : null);
      setExistingVideoPreviewUrl(null);
    }
  };

  // Handler for changing audio caption
  const handleAudioCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentAudioCaptionSrt(e.target.value);
  };

  const handleSave = async () => {
    if (!formData.content.trim() || !formData.examType.trim()) {
        toast({
            title: "输入错误",
            description: "内容和考试类型不能为空。",
            variant: "destructive",
        });
        return;
    }

    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      let finalAttachment: Attachment | null = null;

      // Start with a base attachment object, prioritizing existing one's ID/resourceId
      if (resource && existingAttachment) {
          finalAttachment = { ...existingAttachment };
      } else {
          // For a new resource, or if no existing attachment, create a placeholder
          finalAttachment = {
              id: 0, // Backend will assign real ID for new attachments
              resourceId: resource?.id ?? 0, // Will be updated by backend for new attachments
              audioKey: null,
              videoKey: null,
              captionSrt: null,
              captionTxt: null,
          };
      }

      // Determine the final audioKey
      if (newAudioFile) {
          finalAttachment.audioKey = `temp_audio_${Date.now()}.${newAudioFile.name.split('.').pop()}`;
      } else {
          // If no new audio, use existing audioKey from state (which might have been nullified by handleDeleteAudio)
          finalAttachment.audioKey = existingAttachment?.audioKey || null;
      }

      // Determine the final videoKey
      if (newVideoFile) {
          finalAttachment.videoKey = `temp_video_${Date.now()}.${newVideoFile.name.split('.').pop()}`;
      } else {
          // If no new video, use existing videoKey from state (which might have been nullified by handleDeleteVideo)
          finalAttachment.videoKey = existingAttachment?.videoKey || null;
      }

      // Always apply the current audio caption, regardless of audio file presence
      finalAttachment.captionSrt = currentAudioCaptionSrt || null;
      // captionTxt is not edited in UI, so set to null or keep original if exists
      finalAttachment.captionTxt = null; // Assuming no modification, backend can handle this

      // If after all updates, the attachment has no media keys and no caption, we don't send it.
      const attachmentsArray: Attachment[] = [];
      if (finalAttachment.audioKey || finalAttachment.videoKey || finalAttachment.captionSrt) {
          attachmentsArray.push(finalAttachment);
      }

      const dataToSave: Partial<ResourceWithAttachments> = {
        id: resource?.id,
        content: formData.content,
        examType: formData.examType,
        sourceType: formData.sourceType,
        updatedAt: new Date().toISOString(),
        attachments: attachmentsArray, // Pass the consolidated attachments array
      };

      onSave(dataToSave);
      toast({
        title: "保存成功",
        description: "资源信息已更新",
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: "更新资源信息时发生错误",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // New handler for sync button click
  const handleSync = async () => {
    if (!resource || !resource.uuid || formData.sourceType !== 'url' || !formData.content.trim()) {
      toast({
        title: "同步失败",
        description: "只有现有URL资源才能同步，且内容不能为空。",
        variant: "destructive",
      });
      return;
    }

    // setIsSyncing(true);
    try {
      // Simulate backend API call for syncing a URL resource
      // In a real application, you would make an axiosPrivate.post/put call here
      // For example: await axiosPrivate.post(`/api/analyze/sync-url/${resource.uuid}`, { url: formData.content });
    //   console.log(`Simulating sync for resource ID: ${resource.id}, UUID: ${resource.uuid}, URL: ${formData.content}`);
    //   await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay

      onReSync(resource.id);

      toast({
        title: "同步请求已发送",
        description: "资源已提交重新分析。",
      });
      // Optionally, you might want to refresh the history data after sync
      // onSyncSuccess?.(); // If a callback is passed from parent
    } catch (error) {
      console.error("Error during sync:", error);
      toast({
        title: "同步失败",
        description: "同步资源时发生错误。",
        variant: "destructive",
      });
    // } finally {
    //   setIsSyncing(false);
    }
  };


  const handleClose = useCallback(() => {
    // Clean up new preview URLs (those created by URL.createObjectURL)
    if (newAudioPreviewUrl) {
      URL.revokeObjectURL(newAudioPreviewUrl);
    }
    if (newVideoPreviewUrl) {
      URL.revokeObjectURL(newVideoPreviewUrl);
    }
    onOpenChange(false);
  }, [newAudioPreviewUrl, newVideoPreviewUrl, onOpenChange]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="
          flex flex-col
          w-[calc(100vw-2rem)]
          max-w-full
          sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl
          max-h-[95vh]
          p-4 sm:p-6
          rounded-lg shadow-xl
        "
      >
        <DialogHeader>
          <DialogTitle>{isNewRecord ? "新增资源" : "编辑资源"}</DialogTitle>
        </DialogHeader>
        
        {/* Scrollable content area */}
        <div className="flex-grow overflow-y-auto pr-2">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sourceType">资源类型</Label>
              <Select
                value={formData.sourceType}
                onValueChange={isNewRecord ? (value: "url" | "article" | "pdf" | "image") => 
                  setFormData(prev => ({ ...prev, sourceType: value })) : undefined
                }
                disabled={!isNewRecord}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="article">文章</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="image">图片</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="examType">考试类型</Label>
              <Input
                id="examType"
                value={formData.examType}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, examType: e.target.value }))
                }
                placeholder="例如：托福、雅思、GRE等"
                readOnly={!isNewRecord}
                disabled={!isNewRecord}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">内容</Label>
              <div className="flex gap-2"> {/* Added flex container for content and sync button */}
                {formData.sourceType !== 'url' && (
                    <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => 
                        setFormData(prev => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="输入资源内容..."
                    className="min-h-[100px] flex-grow" // flex-grow to make it take available space
                    readOnly={!isNewRecord}
                    disabled={!isNewRecord}
                    />
                )}
                {formData.sourceType === 'url' && (
                    <Input
                        id="content"
                        value={formData.content}
                        onChange={(e) => 
                        setFormData(prev => ({ ...prev, content: e.target.value }))
                        }
                        placeholder="输入资源地址"
                        readOnly={!isNewRecord}
                        disabled={!isNewRecord}
                    />
                )}

                {/* Sync button for URL type only and when editing existing record */}
                {!isNewRecord && formData.sourceType === 'url' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        title="同步此URL资源"
                        disabled={isSaving || isSyncing} // Disable if saving or already syncing
                        className="self-end" // Align to bottom
                      >
                        {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认同步？</AlertDialogTitle>
                        <AlertDialogDescription>
                          您确定要重新同步此URL资源吗？此操作将触发后端重新分析其内容。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSync}>
                          {isSyncing ? "同步中..." : "确认同步"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* 音频文件上传/管理 */}
            <div className="grid gap-2">
              <Label>音频文件</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={handleNewAudioUpload}
                  className="hidden"
                  id="audio-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('audio-upload')?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {newAudioFile ? "重新上传音频" : "上传音频"}
                </Button>
                {(newAudioFile || (existingAttachment && existingAttachment.audioKey)) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAudio}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* 新上传音频预览 */}
              {newAudioPreviewUrl && (
                <div className="border rounded-lg p-3 bg-gray-50 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileAudio className="h-4 w-4" />
                    <span className="text-sm font-medium">{newAudioFile?.name || "新上传音频"}</span>
                  </div>
                  <audio controls className="w-full">
                    <source src={newAudioPreviewUrl} />
                    您的浏览器不支持音频播放
                  </audio>
                </div>
              )}
              
              {/* 显示已有音频 (仅当没有新上传且已存在) */}
              {!newAudioFile && existingAttachment && existingAttachment.audioKey && existingAudioPreviewUrl && (
                <div className="border rounded-lg p-3 bg-gray-50 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileAudio className="h-4 w-4" />
                    <span className="text-sm">
                      已有音频: {existingAttachment.audioKey}
                    </span>
                  </div>
                  <audio controls className="w-full">
                    <source src={existingAudioPreviewUrl} />
                    您的浏览器不支持音频播放
                  </audio>
                </div>
              )}

              {/* 音频字幕编辑 (独立于音频文件) */}
              <div className="mt-3">
                <Label htmlFor="audio-caption-srt">音频字幕 (SRT)</Label>
                <Textarea
                  id="audio-caption-srt"
                  value={currentAudioCaptionSrt}
                  onChange={handleAudioCaptionChange}
                  placeholder="输入音频字幕 (SRT格式)"
                  className="min-h-[60px]"
                />
              </div>
            </div>

            {/* 视频文件上传/管理 */}
            <div className="grid gap-2">
              <Label>视频文件</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleNewVideoUpload}
                  className="hidden"
                  id="video-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('video-upload')?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {newVideoFile ? "重新上传视频" : "上传视频"}
                </Button>
                {(newVideoFile || (existingAttachment && existingAttachment.videoKey)) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteVideo}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* 新上传视频预览 */}
              {newVideoPreviewUrl && (
                <div className="border rounded-lg p-3 bg-gray-50 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileVideo className="h-4 w-4" />
                    <span className="text-sm font-medium">{newVideoFile?.name || "新上传视频"}</span>
                  </div>
                  <video controls className="w-full max-h-48">
                    <source src={newVideoPreviewUrl} />
                    您的浏览器不支持视频播放
                  </video>
                  {/* 视频字幕已移除 */}
                </div>
              )}
              
              {/* 显示已有视频 (仅当没有新上传且已存在) */}
              {!newVideoFile && existingAttachment && existingAttachment.videoKey && existingVideoPreviewUrl && (
                <div className="border rounded-lg p-3 bg-gray-50 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileVideo className="h-4 w-4" />
                    <span className="text-sm">
                      已有视频: {existingAttachment.videoKey}
                    </span>
                  </div>
                  <video controls className="w-full max-h-48">
                    <source src={existingVideoPreviewUrl} />
                    您的浏览器不支持视频播放
                  </video>
                  {/* 视频字幕已移除 */}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
