import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  History,
  PlusCircle,
  ShieldCheck
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

interface ProfileSidebarProps {
  username?: string | null;
  avatarSrc?: string | null;
  activeSection: "profile" | "history" | "wordHistory" | "wordManagement";
  onSelectSection: (section: "profile" | "history" | "wordHistory" | "wordManagement") => void;
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
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (variant === "profile" && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const baseMenuItems = [
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
    {
      id: "wordHistory",
      title: "浏览历史",
      icon: <History className="h-4 w-4" />,
    },
  ];

  const adminMenuItem = {
    id: "wordManagement",
    title: "单词管理",
    icon: <ShieldCheck className="h-4 w-4" />,
  };

  const menuItems = user?.role === 'admin' ? [...baseMenuItems, adminMenuItem] : baseMenuItems;

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
            onClick={() => onSelectSection(item.id as "profile" | "history" | "wordHistory" | "wordManagement")}>
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