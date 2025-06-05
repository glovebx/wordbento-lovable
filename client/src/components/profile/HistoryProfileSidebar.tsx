import { Link } from "react-router-dom";
// import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Settings, User, History, Upload } from "lucide-react";

interface HistoryProfileSidebarProps {
  username?: string;
  avatarSrc?: string | null;
  activeSection: string;
  onSelectSection: (section: string) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const HistoryProfileSidebar: React.FC<HistoryProfileSidebarProps> = ({
  username,
  avatarSrc,
  activeSection,
  onSelectSection,
  onAvatarUpload
}) => {
  const menuItems = [
    { id: "language", label: "语言设置", icon: Settings, href: "/profile" },
    { id: "gemini", label: "Gemini API", icon: Settings, href: "/profile" },
    { id: "deepseek", label: "DeepSeek API", icon: Settings, href: "/profile" },
    { id: "history", label: "解析历史", icon: History, href: "/history" }
  ];

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <Avatar className="h-20 w-20 cursor-pointer group-hover:opacity-80 transition-opacity">
              <AvatarImage src={avatarSrc || undefined} alt={username} />
              <AvatarFallback className="text-lg">
                {username ? username.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg">{username}</h3>
            <p className="text-sm text-muted-foreground">个人中心</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton 
                asChild
                isActive={activeSection === item.id}
                className="w-full justify-start"
              >
                <Link to={item.href} onClick={() => onSelectSection(item.id)}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};