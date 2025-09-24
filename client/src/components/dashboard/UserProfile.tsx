
// import { useState, useRef } from "react";
// import { Link } from "react-router-dom";
// import { useAuth } from "@/contexts/AuthContext";
// import { toast } from "@/hooks/use-toast";
// import { Button } from "@/components/ui/button";
// import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
// import { useIsMobile } from "@/hooks/use-mobile";
// import { Home } from "lucide-react";

// // Import the components
// import { LanguageSettings } from "@/components/profile/LanguageSettings";
// import { ApiSettings } from "@/components/profile/ApiSettings";
// import { AvatarEditor } from "@/components/profile/AvatarEditor";
// import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
// import { MobileNavigation } from "@/components/profile/MobileNavigation";

// const UserProfile = () => {
//   const { user, isAuthenticated } = useAuth();
//   const [activeSection, setActiveSection] = useState<string>("language");
//   const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
//   const [isEditing, setIsEditing] = useState(false);
//   const isMobile = useIsMobile();
  
//   // Refs for sections
//   const languageSectionRef = useRef<HTMLDivElement>(null);
//   const geminiSectionRef = useRef<HTMLDivElement>(null);
//   const deepseekSectionRef = useRef<HTMLDivElement>(null);

//   // Language settings
//   const [nativeLanguage, setNativeLanguage] = useState("chinese");
//   const [targetLanguage, setTargetLanguage] = useState("english");
  
//   // API settings
//   const [geminiEndpoint, setGeminiEndpoint] = useState("");
//   const [geminiApiKey, setGeminiApiKey] = useState("");
//   const [geminiModel, setGeminiModel] = useState("");
//   const [deepseekEndpoint, setDeepseekEndpoint] = useState("");
//   const [deepseekApiKey, setDeepseekApiKey] = useState("");
//   const [deepseekModel, setDeepseekModel] = useState("");

//   const [isSavingLanguage, setIsSavingLanguage] = useState(false);
//   // State to track saving status for each API section
//   const [isSavingGemini, setIsSavingGemini] = useState(false);
//   const [isSavingDeepseek, setIsSavingDeepseek] = useState(false);

//   // if (!isAuthenticated) {
//   //   return <Navigate to="/" />;
//   // }

//   const scrollToSection = (section: string) => {
//     setActiveSection(section);
    
//     // Scroll to the corresponding section
//     switch (section) {
//       case "language":
//         languageSectionRef.current?.scrollIntoView({ behavior: "smooth" });
//         break;
//       case "gemini":
//         geminiSectionRef.current?.scrollIntoView({ behavior: "smooth" });
//         break;
//       case "deepseek":
//         deepseekSectionRef.current?.scrollIntoView({ behavior: "smooth" });
//         break;
//       default:
//         break;
//     }
//   };

//   const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         setAvatarSrc(event.target?.result as string);
//         setIsEditing(true);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleSaveAvatar = () => {
//     setIsEditing(false);
//     toast({
//       title: "Avatar updated",
//       description: "Your profile picture has been updated successfully.",
//     });
//   };

//   const handleCancelEdit = () => {
//     setIsEditing(false);
//   };


//   // Handler to save Language Settings
//   // TODO: Implement this handler if LanguageSettings has a save button
//   /*
//   const handleSaveLanguageSettings = async (native: string, target: string) => {
//       setIsSavingLanguage(true);
//       // TODO: Implement actual API call to save language settings
//       console.log("Saving Language Settings:", { native, target });
//       await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay
//       setIsSavingLanguage(false);
//       toast({
//           title: "Language Settings Saved",
//           description: "Your language preferences have been updated.",
//       });
//        // TODO: Handle API call success/failure and update UI accordingly
//   };
//   */


//     // Handler to save Gemini API settings
//     const handleSaveLanguageSettings = async (nativeLanguage: string, targetLanguage: string) => {
//       setIsSavingLanguage(true); // Set saving state for Gemini
//       // TODO: Implement actual API call to save Gemini settings to the backend
//       console.log("Saving Gemini Settings:", { nativeLanguage, targetLanguage }); // Log data for debugging
//       await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay
//       setIsSavingLanguage(false); // Reset saving state
//       toast({ // Show a success toast
//           title: "Languange Settings Saved",
//           description: "Your Languange settings have been updated.",
//       });
//       // TODO: Handle API call success/failure and update UI accordingly (e.g., show error toast)
//   };

//   // Handler to save Gemini API settings
//   const handleSaveGeminiSettings = async (endpoint: string, apiKey: string, model: string) => {
//     setIsSavingGemini(true); // Set saving state for Gemini
//     // TODO: Implement actual API call to save Gemini settings to the backend
//     console.log("Saving Gemini Settings:", { endpoint, apiKey, model }); // Log data for debugging
//     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay
//     setIsSavingGemini(false); // Reset saving state
//     toast({ // Show a success toast
//         title: "Gemini Settings Saved",
//         description: "Your Gemini API settings have been updated.",
//     });
//     // TODO: Handle API call success/failure and update UI accordingly (e.g., show error toast)
// };

// // Handler to save DeepSeek API settings
// const handleSaveDeepseekSettings = async (endpoint: string, apiKey: string, model: string) => {
//     setIsSavingDeepseek(true); // Set saving state for DeepSeek
//     // TODO: Implement actual API call to save DeepSeek settings to the backend
//     console.log("Saving DeepSeek Settings:", { endpoint, apiKey, model }); // Log data for debugging
//     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay
//     setIsSavingDeepseek(false); // Reset saving state
//     toast({ // Show a success toast
//         title: "DeepSeek Settings Saved",
//         description: "Your DeepSeek API settings have been updated.",
//     });
//     // TODO: Handle API call success/failure and update UI accordingly (e.g., show error toast)
// };

//   return (
//     <SidebarProvider defaultOpen={true}>
//       <div className="flex min-h-svh w-full">
//         <ProfileSidebar
//           username={user?.username}
//           avatarSrc={avatarSrc}
//           activeSection={activeSection}
//           onSelectSection={scrollToSection}
//           onAvatarUpload={handleAvatarUpload}
//         />
        
//         <SidebarInset>
//           <div className="p-6 relative">
//             {/* Back Home Button - Top right */}
//             <div className="absolute top-4 right-4 z-30">
//               <Button variant="outline" asChild>
//                 <Link to="/" className="flex items-center gap-2">
//                   <Home className="h-4 w-4" />
//                   Back to Home
//                 </Link>
//               </Button>
//             </div>
            
//             {/* Mobile Navigation */}
//             {isMobile && <MobileNavigation activeSection={activeSection} onSelectSection={scrollToSection} />}
            
//             {isEditing ? (
//               <AvatarEditor 
//                 avatarSrc={avatarSrc}
//                 onCancel={handleCancelEdit}
//                 onSave={handleSaveAvatar}
//               />
//             ) : (
//               <div className="space-y-16 mt-12">
//                 {/* Language Settings Section */}
//                 <div ref={languageSectionRef} id="language-section" className="scroll-mt-12">
//                   <LanguageSettings 
//                     nativeLanguage={nativeLanguage}
//                     setNativeLanguage={setNativeLanguage}
//                     targetLanguage={targetLanguage}
//                     setTargetLanguage={setTargetLanguage}
//                     onSave={handleSaveLanguageSettings} // Pass the specific save handler
//                     isSaving={isSavingLanguage} // Pass the specific saving state                    
//                   />
//                 </div>
                
//                 {/* Gemini API Settings Section */}
//                 <div ref={geminiSectionRef} id="gemini-section" className="scroll-mt-12">
//                   <ApiSettings 
//                     title="Gemini"
//                     endpoint={geminiEndpoint}
//                     setEndpoint={setGeminiEndpoint}
//                     apiKey={geminiApiKey}
//                     setApiKey={setGeminiApiKey}
//                     model={geminiModel}
//                     setModel={setGeminiModel}
//                     endpointId="gemini-endpoint"
//                     apiKeyId="gemini-api-key"
//                     modelId="gemini-model"
//                     onSave={handleSaveGeminiSettings} // Pass the specific save handler
//                     isSaving={isSavingGemini} // Pass the specific saving state                    
//                   />
//                 </div>
                
//                 {/* DeepSeek API Settings Section */}
//                 <div ref={deepseekSectionRef} id="deepseek-section" className="scroll-mt-12">
//                   <ApiSettings 
//                     title="DeepSeek"
//                     endpoint={deepseekEndpoint}
//                     setEndpoint={setDeepseekEndpoint}
//                     apiKey={deepseekApiKey}
//                     setApiKey={setDeepseekApiKey}
//                     model={deepseekModel}
//                     setModel={setDeepseekModel}
//                     endpointId="deepseek-endpoint"
//                     apiKeyId="deepseek-api-key"
//                     modelId="deepseek-model"
//                     onSave={handleSaveDeepseekSettings} // Pass the specific save handler
//                     isSaving={isSavingDeepseek} // Pass the specific saving state
//                   />
//                 </div>
                
//                 {/* <div className="flex justify-end">
//                   <Button onClick={handleSaveSettings}>
//                     Save All Settings
//                   </Button>
//                 </div> */}
//               </div>
//             )}
//           </div>
//         </SidebarInset>
//       </div>
//     </SidebarProvider>
//   );
// };

// export default UserProfile;

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

// 只导入与页面内容直接相关的组件
import { LanguageSettings } from "@/components/profile/LanguageSettings";
import { ApiSettings } from "@/components/profile/ApiSettings";

const UserProfile = () => {
  const { isAuthenticated } = useAuth();
  
  // Refs for sections
  const languageSectionRef = useRef<HTMLDivElement>(null);
  const geminiSectionRef = useRef<HTMLDivElement>(null);
  const deepseekSectionRef = useRef<HTMLDivElement>(null);
  const jimengSectionRef = useRef<HTMLDivElement>(null);
  const scraperSectionRef = useRef<HTMLDivElement>(null);

  // Language settings
  const [nativeLanguage, setNativeLanguage] = useState("chinese");
  const [targetLanguage, setTargetLanguage] = useState("english");
  
  // API settings
  const [geminiEndpoint, setGeminiEndpoint] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("");
  const [deepseekEndpoint, setDeepseekEndpoint] = useState("");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekModel, setDeepseekModel] = useState("");
  const [jimengEndpoint, setJimengEndpoint] = useState("");
  const [jimengApiKey, setJimengApiKey] = useState("");
  const [jimengModel, setJimengModel] = useState("");  
  const [scraperEndpoint, setScraperEndpoint] = useState("");
  const [scraperApiKey, setScraperApiKey] = useState("");
  const [scraperModel, setScraperModel] = useState("");

  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isSavingDeepseek, setIsSavingDeepseek] = useState(false);
  const [isSavingJimeng, setIsSavingJimeng] = useState(false);
  const [isSavingScraper, setIsSavingScraper] = useState(false);

  // 移除了所有与头像编辑相关的状态和函数
  // 例如：avatarSrc, isEditing, handleAvatarUpload, handleSaveAvatar, handleCancelEdit

  const handleSaveLanguageSettings = async (nativeLanguage: string, targetLanguage: string) => {
      setIsSavingLanguage(true);
      console.log("Saving Language Settings:", { nativeLanguage, targetLanguage });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSavingLanguage(false);
      toast({
          title: "Language Settings Saved",
          description: "Your Language settings have been updated.",
      });
  };

  const handleSaveGeminiSettings = async (endpoint: string, apiKey: string, model: string) => {
    setIsSavingGemini(true);
    console.log("Saving Gemini Settings:", { endpoint, apiKey, model });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSavingGemini(false);
    toast({
        title: "Gemini Settings Saved",
        description: "Your Gemini API settings have been updated.",
    });
  };

  const handleSaveDeepseekSettings = async (endpoint: string, apiKey: string, model: string) => {
    setIsSavingDeepseek(true);
    console.log("Saving DeepSeek Settings:", { endpoint, apiKey, model });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSavingDeepseek(false);
    toast({
        title: "DeepSeek Settings Saved",
        description: "Your DeepSeek API settings have been updated.",
    });
  };

  const handleSaveJimengSettings = async (endpoint: string, apiKey: string, model: string) => {
    setIsSavingJimeng(true);
    console.log("Saving Jimeng Settings:", { endpoint, apiKey, model });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSavingJimeng(false);
    toast({
        title: "Jimeng Settings Saved",
        description: "Your Jimeng API settings have been updated.",
    });
  };  

  const handleSaveScraperSettings = async (endpoint: string, apiKey: string, model: string) => {
    setIsSavingScraper(true);
    console.log("Saving Jimeng Settings:", { endpoint, apiKey, model });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSavingScraper(false);
    toast({
        title: "Scraper Settings Saved",
        description: "Your Scraper API settings have been updated.",
    });
  };  

  return (
    <div className="p-6 relative">
      <div className="absolute top-4 right-4 z-30">
        <Button variant="outline" asChild>
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      
      <div className="space-y-16 mt-12">
        {/* Language Settings Section */}
        <div ref={languageSectionRef} id="language-section" className="scroll-mt-12">
          <LanguageSettings 
            nativeLanguage={nativeLanguage}
            setNativeLanguage={setNativeLanguage}
            targetLanguage={targetLanguage}
            setTargetLanguage={setTargetLanguage}
            onSave={handleSaveLanguageSettings}
            isSaving={isSavingLanguage}
          />
        </div>
        
        {/* Gemini API Settings Section */}
        <div ref={geminiSectionRef} id="gemini-section" className="scroll-mt-12">
          <ApiSettings 
            title="Gemini"
            endpoint={geminiEndpoint}
            setEndpoint={setGeminiEndpoint}
            apiKey={geminiApiKey}
            setApiKey={setGeminiApiKey}
            model={geminiModel}
            setModel={setGeminiModel}
            endpointId="gemini-endpoint"
            apiKeyId="gemini-api-key"
            modelId="gemini-model"
            onSave={handleSaveGeminiSettings}
            isSaving={isSavingGemini}
          />
        </div>
        
        {/* DeepSeek API Settings Section */}
        <div ref={deepseekSectionRef} id="deepseek-section" className="scroll-mt-12">
          <ApiSettings 
            title="DeepSeek"
            endpoint={deepseekEndpoint}
            setEndpoint={setDeepseekEndpoint}
            apiKey={deepseekApiKey}
            setApiKey={setDeepseekApiKey}
            model={deepseekModel}
            setModel={setDeepseekModel}
            endpointId="deepseek-endpoint"
            apiKeyId="deepseek-api-key"
            modelId="deepseek-model"
            onSave={handleSaveDeepseekSettings}
            isSaving={isSavingDeepseek}
          />
        </div>

        {/* Jimeng API Settings Section */}
        <div ref={jimengSectionRef} id="jimeng-section" className="scroll-mt-12">
          <ApiSettings 
            title="Jimeng"
            endpoint={jimengEndpoint}
            setEndpoint={setJimengEndpoint}
            apiKey={jimengApiKey}
            setApiKey={setJimengApiKey}
            model={jimengModel}
            setModel={setJimengModel}
            endpointId="jimeng-endpoint"
            apiKeyId="jimeng-api-key"
            modelId="jimeng-model"
            onSave={handleSaveJimengSettings}
            isSaving={isSavingJimeng}
          />
        </div>  

        {/* Scraper API Settings Section */}
        <div ref={scraperSectionRef} id="scraper-section" className="scroll-mt-12">
          <ApiSettings 
            title="Scraper"
            endpoint={scraperEndpoint}
            setEndpoint={setScraperEndpoint}
            apiKey={scraperApiKey}
            setApiKey={setScraperApiKey}
            model={scraperModel}
            setModel={setScraperModel}
            endpointId="scraper-endpoint"
            apiKeyId="scraper-api-key"
            modelId="scraper-model"
            onSave={handleSaveScraperSettings}
            isSaving={isSavingScraper}
          />
        </div>

      </div>
    </div>
  );
};

export default UserProfile;