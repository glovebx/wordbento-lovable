
import { User, Upload, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface ProfileSidebarProps {
  username?: string;
  avatarSrc: string | null;
  activeSection: string;
  onSelectSection: (section: string) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProfileSidebar = ({ 
  username, 
  avatarSrc, 
  activeSection, 
  onSelectSection,
  onAvatarUpload 
}: ProfileSidebarProps) => {
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex flex-col items-center py-4">
          <div className="relative group">
            <Avatar className="h-24 w-24 cursor-pointer">
              {avatarSrc ? (
                <AvatarImage src={avatarSrc} alt={username || ""} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-xl">
                  {username?.charAt(0).toUpperCase() || <User size={32} />}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/20 group-hover:opacity-100 rounded-full transition-all">
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <Upload className="h-6 w-6 text-white" />
                <span className="sr-only">Upload avatar</span>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={onAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
          <h3 className="mt-2 text-lg font-medium">{username}</h3>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={activeSection === "language"}
              onClick={() => onSelectSection("language")}
            >
              <Settings className="mr-2" />
              Language Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={activeSection === "gemini"}
              onClick={() => onSelectSection("gemini")}
            >
              <Settings className="mr-2" />
              Gemini API
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={activeSection === "deepseek"}
              onClick={() => onSelectSection("deepseek")}
            >
              <Settings className="mr-2" />
              DeepSeek API
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};