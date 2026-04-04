import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ProfileSidebar } from "@/components/dashboard/MenuSidebar";
import AnalysisHistory from "@/components/dashboard/AnalysisHistory";
import UserProfile from "@/components/dashboard/UserProfile";
import WordHistory from "@/components/dashboard/WordHistory";
import WordManagement from "@/components/dashboard/WordManagement";
import LearningStats from "@/components/dashboard/LearningStats";
import { MobileNavigation } from "@/components/dashboard/MobileNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import LoadingFallback from "@/components/LoadingFallback";
import AvatarCropDialog from "@/components/dashboard/AvatarCropDialog"; // Import the new dialog
import { axiosPrivate } from "@/lib/axios"; // For API calls
import { useToast } from "@/components/ui/use-toast"; // For notifications

const Dashboard = () => {
  const { user, isAuthenticated, isSessionLoading, refreshSession } = useAuth();
  const [activeSection, setActiveSection] = useState<"learningStats" | "profile" | "history" | "wordHistory" | "wordManagement">("learningStats");
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // State for the avatar cropping flow
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);


  const handleSelectSection = useCallback((section: "learningStats" | "profile" | "history" | "wordHistory" | "wordManagement") => {
    setActiveSection(section);
  }, []);

  if (isSessionLoading) {
    return <LoadingFallback message="Authenticating..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Step 1: User selects a file. This function is triggered.
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Step 2: Read the file as a data URL and open the crop dialog.
        setImageToCrop(event.target?.result as string);
        setIsCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
     // Reset file input value to allow re-selecting the same file
    if(e.target) {
      e.target.value = '';
    }
  };

  // Step 3: User saves the cropped image in the dialog. This function is called.
  const handleSaveCroppedAvatar = async (croppedImage: string) => {
    try {
      await axiosPrivate.put('/api/profile/avatar', { avatar: croppedImage });
      
      // Step 4: On success, refresh the session to get the updated user object.
      await refreshSession();

      toast({
        title: "Avatar updated",
        description: "Your new avatar has been saved.",
      });

    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast({
        title: "Upload failed",
        description: "There was a problem saving your new avatar.",
        variant: "destructive",
      });
    } finally {
      // Step 5: Close the dialog and clean up state.
      setIsCropDialogOpen(false);
      setImageToCrop(null);
    }
  };


  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <UserProfile />;
      case "history":
        return <AnalysisHistory />;
      case "wordHistory":
        return <WordHistory />;
      case "wordManagement":
        return <WordManagement />;
      case "learningStats":
      default:
        return <LearningStats />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="flex min-h-svh w-full">
          {!isMobile && (
            <ProfileSidebar
              user={user}
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
              onAvatarUpload={handleAvatarUpload}
              variant="dashboard"
            />
          )}
          
          <SidebarInset>
            {isMobile && (
              <MobileNavigation 
                user={user}
                activeSection={activeSection} 
                onSelectSection={handleSelectSection} 
                onAvatarUpload={handleAvatarUpload}
              />
            )}
            {renderContent()}
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* Render the Crop Dialog */}
      <AvatarCropDialog
        open={isCropDialogOpen}
        onOpenChange={setIsCropDialogOpen}
        imageSrc={imageToCrop}
        onSave={handleSaveCroppedAvatar}
      />
    </div>
  );
};

export default Dashboard;