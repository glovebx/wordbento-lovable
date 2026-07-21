import React, { useState, useEffect, useRef, useCallback } from 'react';
import { axiosPrivate } from '@/lib/axios';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import LoadingFallback from '@/components/LoadingFallback';
import { WordDataType } from '@/types/wordTypes';
import EnlargedImageCarouselDialog from '@/components/EnlargedImageCarouselDialog';
import ImageEditorDialog from '@/components/history/ImageEditorDialog';
import { Pencil, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WordImagesProps {
  wordText: string;
  onEditImage?: ((dataUrl: string, url: string, redact: boolean, replace: boolean) => void) | null;
  onDeleteImage?: ((url: string) => void) | null;
  isGeneratingImage?: boolean;  
}

const WordImages: React.FC<WordImagesProps> = ({ wordText, onEditImage, onDeleteImage, isGeneratingImage = false }) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showEnlargedImageDialog, setShowEnlargedImageDialog] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);

  // 使用 ref 来追踪上一次的 isGeneratingImage 值
  const prevIsGeneratingImage = useRef(isGeneratingImage);

  // 监听 isGeneratingImage 从 true 变为 false
  useEffect(() => {
    if (prevIsGeneratingImage.current === true && isGeneratingImage === false) {
      // 保存结束，关闭编辑器
      setEditImageUrl(null);
    }
    // 更新 ref
    prevIsGeneratingImage.current = isGeneratingImage;
  }, [isGeneratingImage]);

  useEffect(() => {
    const fetchImages = async () => {
      if (!wordText) return;

      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosPrivate.post<WordDataType>('/api/word/search', { slug: wordText });
        const images = response.data.imageUrls || [];
        setImageUrls(images);
      } catch (err) {
        setError('Failed to load images.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [wordText]);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setShowEnlargedImageDialog(true);
  }, []);

  const handleEditClick = useCallback((e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    setEditImageUrl(url);
  }, []);

  const handleConfirmDelete = async () => {
    if (imageToDelete === null) return;

    setIsDeleting(true);
    onDeleteImage?.(imageToDelete);
    setIsDeleting(false);
  };

  if (isLoading) {
    return <LoadingFallback message="Loading images..." />;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (imageUrls.length === 0) {
    return <div className="text-muted-foreground text-center p-4">No images found for this word.</div>;
  }

  return (
    <>
      <div className="max-w-md mx-auto p-4">
        <div className="flex flex-wrap gap-4">
          {imageUrls.map((url, index) => (
            <div key={index} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-1.1rem)] flex-grow group">
              <div 
                className="rounded-md overflow-hidden cursor-pointer transition-opacity hover:opacity-80 relative"
                onClick={() => handleImageClick(index)}
              >
                <AspectRatio ratio={16 / 9} className="bg-muted">
                  <img
                    src={url}
                    alt={`Image for ${wordText} ${index + 1}`}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                </AspectRatio>

                {/* Edit icon overlay on hover */}
                {onEditImage && (
                <div
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => handleEditClick(e, url)}
                  title="编辑图片"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer">
                    <Pencil className="h-4 w-4" />
                  </div>
                </div>
                )}

                {/* Delete icon overlay on hover */}
                {onDeleteImage && (
                <div
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => { e.stopPropagation(); setImageToDelete(url); }}
                  title="删除图片"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </div>
                </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showEnlargedImageDialog && (
        <EnlargedImageCarouselDialog
          open={showEnlargedImageDialog}
          onOpenChange={setShowEnlargedImageDialog}
          imageUrls={imageUrls}
          wordText={wordText}
          initialIndex={selectedImageIndex}
        />
      )}

      {editImageUrl && (
        <ImageEditorDialog
          open={!!editImageUrl}
          onOpenChange={(open) => { if (!open) setEditImageUrl(null); }}
          imageUrl={editImageUrl}
          wordText={wordText}
          onSave={onEditImage!}
          isSavingImage={isGeneratingImage}
        />
      )}

      <AlertDialog open={imageToDelete !== null} onOpenChange={(open) => !open && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image from the servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>      
    </>
  );
};

export default WordImages;
