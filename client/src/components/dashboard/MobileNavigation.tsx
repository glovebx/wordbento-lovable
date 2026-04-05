import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ProfileSidebar } from "@/components/dashboard/MenuSidebar";
import { useState } from "react";
import { User } from "@/contexts/AuthContext";

interface MobileNavigationProps {
  user: User | null;
  activeSection: "learningStats" | "profile" | "history" | "wordHistory" | "wordManagement";
  onSelectSection: (section: "learningStats" | "profile" | "history" | "wordHistory" | "wordManagement") => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MobileNavigation = ({ activeSection, onSelectSection, user, onAvatarUpload }: MobileNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectSectionAndClose = (section: "learningStats" | "profile" | "history" | "wordHistory" | "wordManagement") => {
    onSelectSection(section);
    setIsOpen(false);
  };  
  return (
    <div className="fixed top-4 left-4 z-30 md:hidden">
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button size="icon" variant="outline">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="w-full h-full max-w-[calc(100vw-64px)] rounded-r-none">
          {/* 移除额外的 div 容器，直接将 DrawerClose 按钮进行定位 */}
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 h-10 w-10 p-2 z-10" // 增加 z-index 以确保它在最上层
            >
              <X className="h-full w-full" />
              <span className="sr-only">Close menu</span>
            </Button>
          </DrawerClose>
          
          <div className="relative pt-12 pb-4 h-full"> {/* 留出顶部空间给关闭按钮 */}
            <ProfileSidebar 
              user={user}
              activeSection={activeSection}
              onSelectSection={handleSelectSectionAndClose} // 传递新的处理函数
              onAvatarUpload={onAvatarUpload}
              variant="dashboard"
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};