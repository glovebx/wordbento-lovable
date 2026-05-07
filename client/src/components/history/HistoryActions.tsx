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
import { Edit, Trash2, ListPlus } from "lucide-react"; // Import Edit and Trash2 icons
import { ResourceWithAttachments } from "@/types/database";

interface HistoryActionsProps {
  resource: ResourceWithAttachments;
  onEditResource: (resourceId: number) => void;
  onDeleteResource: (resourceId: number) => void;
  onEditPlaylist: (resourceId: number) => void;
}

export const HistoryActions: React.FC<HistoryActionsProps> = ({
  resource,
  onEditResource,
  onDeleteResource,
  onEditPlaylist,
}) => {
  const handleEditClick = () => {
    onEditResource(resource.id);
  };

  const handleDeleteConfirm = () => {
    onDeleteResource(resource.id);
  };

  const handlePlaylistClick = () => {
    onEditPlaylist(resource.id);
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Button variant="ghost" size="icon" onClick={handlePlaylistClick} title="编辑播放列表">
        <ListPlus className="h-4 w-4" />
      </Button>

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
