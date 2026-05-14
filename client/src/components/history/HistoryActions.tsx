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
import { cn } from "@/lib/utils";
import { Edit, Trash2, ListPlus, ImageIcon, Loader2 } from "lucide-react";
import { axiosPrivate } from "@/lib/axios";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";


interface CoverSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  onConfirm: (selectedImage: string) => void;
}

const CoverSelectionDialog: React.FC<CoverSelectionDialogProps> = ({ open, onOpenChange, images, onConfirm }) => {
  const [api, setApi] = React.useState<any>();
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);
    handleSelect(); // Initial call

    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  const handleConfirm = () => {
    if (selectedIndex !== null) {
      onConfirm(images[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[80vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>选择封面图片</DialogTitle>
        </DialogHeader>
        <Carousel
          opts={{ align: "start" }}
          className="w-full flex-1"
          setApi={setApi}
        >
          <CarouselContent className="h-full">
            {images.map((url, index) => (
              <CarouselItem key={index} className="flex items-center justify-center">
                <div className={cn(
                  "p-1 border-2 rounded-md h-full",
                  selectedIndex === index ? "border-primary" : "border-transparent"
                )}>
                  <img src={url} alt={`Generated cover ${index + 1}`} className="rounded-md aspect-video object-contain h-full" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">取消</Button>
          <Button onClick={handleConfirm} disabled={selectedIndex === null}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { ResourceWithAttachments } from "@/types/database";

interface HistoryActionsProps {
  resource: ResourceWithAttachments;
  onEditResource: (resourceId: number) => void;
  onDeleteResource: (resourceId: number) => void;
  onEditPlaylist: (resourceId: number) => void;
  onUpdateResource: (id: number, values: Partial<ResourceWithAttachments>) => void;
}

export const HistoryActions: React.FC<HistoryActionsProps> = ({
  resource,
  onEditResource,
  onDeleteResource,
  onEditPlaylist,
  onUpdateResource,
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isCarouselOpen, setIsCarouselOpen] = React.useState(false);
  const [generatedImages, setGeneratedImages] = React.useState<string[]>([]);
  const [isTitleConfirmOpen, setIsTitleConfirmOpen] = React.useState(false);
  const [editableTitle, setEditableTitle] = React.useState("");
  const handleEditClick = () => {
    onEditResource(resource.id);
  };

  const handleDeleteConfirm = () => {
    onDeleteResource(resource.id);
  };

  const handlePlaylistClick = () => {
    onEditPlaylist(resource.id);
  };

  const handleGenerateCoverClick = () => {
    setEditableTitle(resource.title || "");
    setIsTitleConfirmOpen(true);
  };

  const handleConfirmAndGenerate = async () => {
    setIsTitleConfirmOpen(false);
    setIsGenerating(true);
    try {
      const response = await axiosPrivate.post("/api/analyze/generate-cover", { 
        resourceId: resource.id, 
        title: editableTitle 
      });
      if (response.data && response.data.length > 0) {
        setGeneratedImages(response.data);
        setIsCarouselOpen(true);
      } else {
        toast({ title: "无法生成封面", description: "未能获取任何图片，请尝试修改标题。", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to generate cover:", error);
      toast({ title: "生成封面失败", description: "服务器发生错误，请稍后再试。", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmSelection = (selectedImage: string) => {
    onUpdateResource(resource.id, { thumbnail: selectedImage });
    setIsCarouselOpen(false);
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Button variant="ghost" size="icon" onClick={handlePlaylistClick} title="编辑播放列表">
        <ListPlus className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={handleEditClick} title="编辑">
        <Edit className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={handleGenerateCoverClick} title="生成封面图片" disabled={isGenerating}>
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
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

      <CoverSelectionDialog
        open={isCarouselOpen}
        onOpenChange={setIsCarouselOpen}
        images={generatedImages}
        onConfirm={handleConfirmSelection}
      />

      <AlertDialog open={isTitleConfirmOpen} onOpenChange={setIsTitleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认标题并生成封面</AlertDialogTitle>
            <AlertDialogDescription>
              您可以修改下面的标题，以便更精确地生成封面图片。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value)}
              placeholder="输入标题..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAndGenerate}>确认生成</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
