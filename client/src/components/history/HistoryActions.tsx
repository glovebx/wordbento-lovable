import React from "react";
import { Button } from "@/components/ui/button";
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
import { Edit, Trash2 } from "lucide-react"; // Import Edit and Trash2 icons
import { ResourceWithAttachments } from "@/types/database";

interface HistoryActionsProps {
  resource: ResourceWithAttachments;
  // Removed onPlayAudio and onPlayVideo props
  onEditResource: (resourceId: number) => void;
  onDeleteResource: (resourceId: number) => void; // Added onDeleteResource prop
}

export const HistoryActions: React.FC<HistoryActionsProps> = ({
  resource,
  // Removed onPlayAudio, onPlayVideo from destructuring
  onEditResource,
  onDeleteResource,
}) => {
  const handleEditClick = () => {
    onEditResource(resource.id);
  };

  const handleDeleteConfirm = () => {
    onDeleteResource(resource.id);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Removed Audio Play Button */}
      {/* {resource.attachments.some(att => att.audio_key) && (
        <Button variant="ghost" size="icon" onClick={() => onPlayAudio(resource.attachments.find(att => att.audio_key)?.audio_key || '')}>
          <FileAudio className="h-4 w-4" />
        </Button>
      )} */}

      {/* Removed Video Play Button */}
      {/* {resource.attachments.some(att => att.video_key) && (
        <Button variant="ghost" size="icon" onClick={() => onPlayVideo(resource.attachments.find(att => att.video_key)?.video_key || '')}>
          <FileVideo className="h-4 w-4" />
        </Button>
      )} */}

      <Button variant="ghost" size="icon" onClick={handleEditClick} title="编辑">
        <Edit className="h-4 w-4" />
      </Button>

      {/* Delete Button with Confirmation Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="删除">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除此解析记录。此操作无法撤消。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600 text-white">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
