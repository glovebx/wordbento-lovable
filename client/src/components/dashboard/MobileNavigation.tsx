
// import { Menu, Settings } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   Drawer,
//   DrawerClose,
//   DrawerContent,
//   DrawerFooter,
//   DrawerHeader,
//   DrawerTitle,
//   DrawerTrigger,
// } from "@/components/ui/drawer";

// interface MobileNavigationProps {
//   activeSection: string;
//   onSelectSection: (section: string) => void;
// }

// export const MobileNavigation = ({ activeSection, onSelectSection }: MobileNavigationProps) => {
//   return (
//     <div className="fixed top-4 left-4 z-30 md:hidden">
//       <Drawer>
//         <DrawerTrigger asChild>
//           <Button size="icon" variant="outline">
//             <Menu className="h-5 w-5" />
//             <span className="sr-only">Open menu</span>
//           </Button>
//         </DrawerTrigger>
//         <DrawerContent>
//           <DrawerHeader>
//             <DrawerTitle>Settings Navigation</DrawerTitle>
//           </DrawerHeader>
//           <div className="px-4 py-2">
//             <div className="flex flex-col space-y-2">
//               <Button 
//                 variant={activeSection === "language" ? "default" : "ghost"} 
//                 onClick={() => {
//                   onSelectSection("language");
//                 }}
//                 className="justify-start"
//               >
//                 <Settings className="mr-2 h-4 w-4" />
//                 Language Settings
//               </Button>
//               <Button 
//                 variant={activeSection === "gemini" ? "default" : "ghost"} 
//                 onClick={() => {
//                   onSelectSection("gemini");
//                 }}
//                 className="justify-start"
//               >
//                 <Settings className="mr-2 h-4 w-4" />
//                 Gemini API
//               </Button>
//               <Button 
//                 variant={activeSection === "deepseek" ? "default" : "ghost"} 
//                 onClick={() => {
//                   onSelectSection("deepseek");
//                 }}
//                 className="justify-start"
//               >
//                 <Settings className="mr-2 h-4 w-4" />
//                 DeepSeek API
//               </Button>
//             </div>
//           </div>
//           <DrawerFooter>
//             <DrawerClose asChild>
//               <Button variant="outline">Close</Button>
//             </DrawerClose>
//           </DrawerFooter>
//         </DrawerContent>
//       </Drawer>
//     </div>
//   );
// };

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

interface MobileNavigationProps {
  activeSection: "profile" | "history";
  onSelectSection: (section: "profile" | "history") => void;
  username?: string | null;
  avatarSrc?: string | null;
}

export const MobileNavigation = ({ activeSection, onSelectSection, username, avatarSrc }: MobileNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // 点击菜单项后，关闭抽屉并执行onSelectSection
  const handleSelectSectionAndClose = (section: "profile" | "history") => {
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
              username={username}
              avatarSrc={avatarSrc}
              activeSection={activeSection}
              onSelectSection={handleSelectSectionAndClose} // 传递新的处理函数
              variant="dashboard"
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};