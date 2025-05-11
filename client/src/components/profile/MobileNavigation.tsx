
import { Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface MobileNavigationProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
}

export const MobileNavigation = ({ activeSection, onSelectSection }: MobileNavigationProps) => {
  return (
    <div className="fixed top-4 left-4 z-30 md:hidden">
      <Drawer>
        <DrawerTrigger asChild>
          <Button size="icon" variant="outline">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Settings Navigation</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-2">
            <div className="flex flex-col space-y-2">
              <Button 
                variant={activeSection === "language" ? "default" : "ghost"} 
                onClick={() => {
                  onSelectSection("language");
                }}
                className="justify-start"
              >
                <Settings className="mr-2 h-4 w-4" />
                Language Settings
              </Button>
              <Button 
                variant={activeSection === "gemini" ? "default" : "ghost"} 
                onClick={() => {
                  onSelectSection("gemini");
                }}
                className="justify-start"
              >
                <Settings className="mr-2 h-4 w-4" />
                Gemini API
              </Button>
              <Button 
                variant={activeSection === "deepseek" ? "default" : "ghost"} 
                onClick={() => {
                  onSelectSection("deepseek");
                }}
                className="justify-start"
              >
                <Settings className="mr-2 h-4 w-4" />
                DeepSeek API
              </Button>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};