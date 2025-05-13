import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { axiosPrivate } from "@/lib/axios"; // Adjust path as needed
import { cn } from '@/lib/utils'; // Assuming you have a cn utility

// Import Dialog components using the structure you provided
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; // Adjust the import path


interface MasterButtonProps {
    wordId: number; // The database ID of the word to mark as mastered
    onMasteredSuccess: () => void; // Callback to run after successfully marking as mastered
    className?: string; // Optional className for the button
}

const MasterButton: React.FC<MasterButtonProps> = ({ wordId, onMasteredSuccess, className }) => {
    const { toast } = useToast();
    // State to control the visibility of the confirmation dialog
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    // State to manage loading state specifically for the mastering action
    const [isMastering, setIsMastering] = useState(false);

    // Handler for the initial button click - shows the dialog
    const handleMarkAsMasteredClick = () => {      
       if (!wordId) {
        console.error("Cannot mark word as mastered: wordId is missing.");
        toast({
          title: "操作失败",
          description: "无法标记单词已记牢，缺少单词ID。",
          variant: "destructive",
        });
        return;
      }
      setShowConfirmDialog(true); // Show the confirmation dialog
    };

    // Handler for confirming the mastering action in the dialog - performs the API call
    const handleConfirmMastered = async () => {
      setShowConfirmDialog(false); // Close the dialog immediately upon confirmation
      setIsMastering(true); // Set mastering loading state

      try {
        // Send a PUT request to the backend API to mark the word as mastered
        const response = await axiosPrivate.put(`/api/word/master/${wordId}`);

        if (response.status === 200) {
          console.log(`Word ID ${wordId} marked as mastered.`);
          toast({
            title: "成功",
            description: "单词已标记为已记牢。",
            variant: "success",
          });
          // Call the callback function provided by the parent component
          onMasteredSuccess();
        } else {
          // Handle unexpected response status
          console.error(`Failed to mark word as mastered. Status: ${response.status}`);
          toast({
            title: "操作失败",
            description: `标记单词已记牢失败，服务器返回状态码: ${response.status}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error marking word as mastered:", error);
        // Handle network errors or other exceptions
        toast({
          title: "操作失败",
          description: "标记单词已记牢时发生错误。",
          variant: "destructive",
        });
      } finally {
        setIsMastering(false); // Reset mastering loading state
      }
    };

    // Handler for canceling the mastering action in the dialog
    const handleCancelMastered = () => {
      setShowConfirmDialog(false); // Just close the dialog
    };

    return (
        <>
            {/* The Button to trigger the dialog */}
            <button
              onClick={handleMarkAsMasteredClick}
              className={cn(
                "rounded-full p-2 transition-all rounded-full bg-green-500 text-white hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-200 ease-in-out",
                className // Apply any additional class names
              )}
              aria-label="Mark as Mastered"
              disabled={isMastering} // Disable the button while the action is in progress
            >
              {isMastering ? (
                   // Optional: Show a loading spinner inside the button
                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                   <CheckCircle className='h-6 w-6' /> // Lucide checkmark icon
              )}
            </button>

            {/* The Confirmation Dialog */}
             <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>标记为已记牢?</DialogTitle>
                   <DialogDescription>
                     您确定要将此单词标记为已记牢吗？标记后，此单词将被记录为已掌握，并将加载下一个单词。
                   </DialogDescription>
                 </DialogHeader>
                 <DialogFooter>
                   {/* Use regular buttons or your component library's button components */}
                   <button onClick={handleCancelMastered} className="px-4 py-2 rounded-md border">取消</button>
                   <button onClick={handleConfirmMastered} className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600">确认</button>
                 </DialogFooter>
                 {/* DialogClose is typically included in DialogContent */}
               </DialogContent>
             </Dialog>
        </>
    );
};

export default MasterButton;