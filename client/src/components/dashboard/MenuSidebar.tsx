
// import { User, Upload, Settings } from "lucide-react";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import {
//   Sidebar,
//   SidebarHeader,
//   SidebarContent,
//   SidebarMenu,
//   SidebarMenuItem,
//   SidebarMenuButton,
// } from "@/components/ui/sidebar";

// interface ProfileSidebarProps {
//   username?: string;
//   avatarSrc: string | null;
//   activeSection: string;
//   onSelectSection: (section: string) => void;
//   onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
// }

// export const ProfileSidebar = ({ 
//   username, 
//   avatarSrc, 
//   activeSection, 
//   onSelectSection,
//   onAvatarUpload 
// }: ProfileSidebarProps) => {
//   return (
//     <Sidebar>
//       <SidebarHeader className="border-b">
//         <div className="flex flex-col items-center py-4">
//           <div className="relative group">
//             <Avatar className="h-24 w-24 cursor-pointer">
//               {avatarSrc ? (
//                 <AvatarImage src={avatarSrc} alt={username || ""} />
//               ) : (
//                 <AvatarFallback className="bg-primary/10 text-xl">
//                   {username?.charAt(0).toUpperCase() || <User size={32} />}
//                 </AvatarFallback>
//               )}
//             </Avatar>
//             <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/20 group-hover:opacity-100 rounded-full transition-all">
//               <label htmlFor="avatar-upload" className="cursor-pointer">
//                 <Upload className="h-6 w-6 text-white" />
//                 <span className="sr-only">Upload avatar</span>
//               </label>
//               <input
//                 id="avatar-upload"
//                 type="file"
//                 accept="image/*"
//                 onChange={onAvatarUpload}
//                 className="hidden"
//               />
//             </div>
//           </div>
//           <h3 className="mt-2 text-lg font-medium">{username}</h3>
//         </div>
//       </SidebarHeader>
      
//       <SidebarContent>
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <SidebarMenuButton 
//               isActive={activeSection === "language"}
//               onClick={() => onSelectSection("language")}
//             >
//               <Settings className="mr-2" />
//               Language Settings
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//           <SidebarMenuItem>
//             <SidebarMenuButton 
//               isActive={activeSection === "gemini"}
//               onClick={() => onSelectSection("gemini")}
//             >
//               <Settings className="mr-2" />
//               Gemini API
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//           <SidebarMenuItem>
//             <SidebarMenuButton 
//               isActive={activeSection === "deepseek"}
//               onClick={() => onSelectSection("deepseek")}
//             >
//               <Settings className="mr-2" />
//               DeepSeek API
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//         </SidebarMenu>
//       </SidebarContent>
//     </Sidebar>
//   );
// };

import React, { useRef } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  User,
  History,
  PlusCircle,
} from "lucide-react";

interface ProfileSidebarProps {
  username?: string | null;
  avatarSrc?: string | null;
  activeSection: "profile" | "history";
  onSelectSection: (section: "profile" | "history") => void;
  onAvatarUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  variant: "history" | "profile" | "dashboard";
}

export const ProfileSidebar = ({
  username,
  avatarSrc,
  activeSection,
  onSelectSection,
  onAvatarUpload,
  variant,
}: ProfileSidebarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (variant === "profile" && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const menuItems = [
    {
      id: "profile",
      title: "个人中心",
      icon: <User className="h-4 w-4" />,
    },
    {
      id: "history",
      title: "解析历史",
      icon: <History className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex w-72 flex-col space-y-4 border-r px-4 py-8">
      {/* User Info & Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
          <Avatar className="h-20 w-20 border-2 border-primary transition-transform duration-300 ease-in-out group-hover:scale-105">
            <AvatarImage
              src={avatarSrc || `https://api.dicebear.com/7.x/bottts/svg?seed=${username || 'user'}`}
              alt="User Avatar"
              className="object-cover"
            />
            <AvatarFallback>{username ? username[0].toUpperCase() : 'U'}</AvatarFallback>
          </Avatar>
          {variant === "profile" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
              <PlusCircle className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={onAvatarUpload}
          style={{ display: "none" }}
        />
        <h2 className="text-xl font-semibold">{username || "Guest"}</h2>
      </div>

      <div className="flex-1 space-y-2 pt-8">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onSelectSection(item.id as "profile" | "history")}
          >
            <span className="mr-2">{item.icon}</span>
            {item.title}
          </Button>
        ))}
      </div>

      {/* <div className="mt-auto pt-4">
        <Button variant="outline" asChild className="w-full">
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            返回主页
          </Link>
        </Button>
      </div> */}
    </div>
  );
};