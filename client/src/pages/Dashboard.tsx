import { useState, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ProfileSidebar } from "@/components/dashboard/MenuSidebar";
import AnalysisHistory from "@/components/dashboard/AnalysisHistory";
import UserProfile from "@/components/dashboard/UserProfile";
import WordHistory from "@/components/dashboard/WordHistory";
import WordManagement from "@/components/dashboard/WordManagement";
import LearningStats from "@/components/dashboard/LearningStats"; // Import the new component
import { MobileNavigation } from "@/components/dashboard/MobileNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<"learningStats" | "profile" | "history" | "wordHistory" | "wordManagement">("learningStats");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleSelectSection = useCallback((section: "learningStats" | "profile" | "history" | "wordHistory" | "wordManagement") => {
    setActiveSection(section);
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
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
              username={user?.username}
              avatarSrc={avatarSrc}
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
              onAvatarUpload={handleAvatarUpload}
              variant="dashboard"
            />
          )}
          
          <SidebarInset>
            {isMobile && (
              <MobileNavigation 
                activeSection={activeSection} 
                onSelectSection={handleSelectSection} 
              />
            )}
            {renderContent()}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Dashboard;