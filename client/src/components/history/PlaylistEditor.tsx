import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResourceWithAttachments } from '@/types/database';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

const SortableItem = ({ item, onRemove }: { item: ResourceWithAttachments, onRemove: (id: number) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center p-2 my-1 bg-muted rounded-md shadow-sm"
    >
      <button {...attributes} {...listeners} className="cursor-grab p-1">
        <GripVertical className="h-5 w-5 text-gray-500" />
      </button>
      {item.thumbnail && <img src={item.thumbnail} alt="" className="w-16 h-9 object-cover rounded-sm ml-2" />} 
      <span className="flex-grow px-4">{item.content}</span>
      <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>移除</Button>
    </div>
  );
};

const AvailableItem = ({ item, onAdd }: { item: ResourceWithAttachments, onAdd: (item: ResourceWithAttachments) => void }) => {
  return (
    <div className="flex items-center p-2 my-1 bg-muted rounded-md shadow-sm">
      {item.thumbnail && <img src={item.thumbnail} alt="" className="w-16 h-9 object-cover rounded-sm" />} 
      <span className="flex-grow px-4">{item.content}</span>
      <Button variant="ghost" size="sm" onClick={() => onAdd(item)}>添加</Button>
    </div>
  );
};

import { axiosPrivate } from '@/lib/axios';
import { toast } from '@/hooks/use-toast';

interface PlaylistEditorProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceWithAttachments | null;
}

export const PlaylistEditor: React.FC<PlaylistEditorProps> = ({ isOpen, onClose, resource }) => {
  const [playlistItems, setPlaylistItems] = useState<ResourceWithAttachments[]>([]);
  const [availableItems, setAvailableItems] = useState<ResourceWithAttachments[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [availablePage, setAvailablePage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({ threshold: 0.1 });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchAvailableItems = useCallback(async (page: number, search: string) => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await axiosPrivate.get(`/api/analyze/list/20/${page}`, {
        params: { search },
      });
      const newItems = response.data.data.filter((newItem: any) => 
        !playlistItems.some(pi => pi.id === newItem.id)
      );

      if (page === 1) {
        setAvailableItems(newItems);
      } else {
        setAvailableItems(prev => [...prev, ...newItems]);
      }
      setHasMore(response.data.data.length > 0 && response.data.totalCount > page * 20);
    } catch (error) {
      console.error("Failed to fetch available items:", error);
      toast({ title: "Error", description: "Could not load available items.", variant: "destructive" });
      setHasMore(false); // Stop fetching on error
    }
    setIsLoadingMore(false);
  }, [isLoadingMore, playlistItems, resource?.id]);

  useEffect(() => {
    if (isOpen) {
      // Reset and fetch for new search term
      setAvailablePage(1);
      setHasMore(true);
      fetchAvailableItems(1, searchTerm);
    }
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (loadMoreInView && hasMore && !isLoadingMore) {
      const nextPage = availablePage + 1;
      setAvailablePage(nextPage);
      fetchAvailableItems(nextPage, searchTerm);
    }
  }, [loadMoreInView, hasMore, isLoadingMore, availablePage, searchTerm, fetchAvailableItems]);


  useEffect(() => {
    if (resource && isOpen) {
      const fetchPlaylist = async () => {
        setIsLoading(true);
        try {
          const response = await axiosPrivate.get(`/api/analyze/related-resources/${resource.id}`);
          const playlistItemIds = response.data.map((item: any) => item.id);
          if (playlistItemIds.length > 0) {
            // Use the dedicated endpoint to fetch resources by their IDs
            const neededResourcesResponse = await axiosPrivate.post(`/api/analyze/resources-by-ids`, { 
              ids: playlistItemIds 
            });
            // The backend returns the resources in the correct order, but just in case, we'll re-sort them.
            const resourcesById = new Map(neededResourcesResponse.data.map((r: ResourceWithAttachments) => [r.id, r]));
            const sortedPlaylist = playlistItemIds.map((id: number) => resourcesById.get(id)).filter(Boolean);
            setPlaylistItems(sortedPlaylist as ResourceWithAttachments[]);
          } else {
            setPlaylistItems([]);
          }
        } catch (error) {
          console.error("Failed to fetch playlist:", error);
          toast({ title: "Error", description: "Could not load existing playlist.", variant: "destructive" });
        }
        setIsLoading(false);
      };
      fetchPlaylist();
    }
  }, [resource, isOpen]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPlaylistItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddItem = (itemToAdd: ResourceWithAttachments) => {
    setPlaylistItems(prev => [...prev, itemToAdd]);
  };

  const handleRemoveItem = (itemToRemoveId: number) => {
    setPlaylistItems(prev => prev.filter(item => item.id !== itemToRemoveId));
  };

  const handleSave = async () => {
    if (!resource) return;
    setIsLoading(true);
    try {
      const relatedIds = playlistItems.map(item => item.id);
      await axiosPrivate.post(`/api/analyze/related-resources/${resource.id}`, { relatedIds });
      toast({ title: "Success", description: "Playlist saved successfully." });
      onClose();
    } catch (error) {
      console.error("Failed to save playlist:", error);
      toast({ title: "Error", description: "Failed to save the playlist.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (!resource) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>编辑播放列表: {resource.content}</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-4 flex-grow min-h-0">
          {/* Left Side: Current Playlist (Sortable) */}
          <div className="flex-1 flex flex-col border-r pr-4 min-h-0 min-w-0">
            <h3 className="text-lg font-semibold mb-2">当前列表</h3>
            <div className="flex-grow overflow-y-auto pr-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={playlistItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {playlistItems.map(item => (
                    <SortableItem key={item.id} item={item} onRemove={handleRemoveItem} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Right Side: Available Resources */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <h3 className="text-lg font-semibold mb-2">可选项目</h3>
            <Input
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            <div className="flex-grow overflow-y-auto pr-2">
              {availableItems.map(item => (
                <AvailableItem key={item.id} item={item} onAdd={handleAddItem} />
              ))}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center items-center py-4">
                  {isLoadingMore ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-sm text-muted-foreground">加载更多...</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={isLoading}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
