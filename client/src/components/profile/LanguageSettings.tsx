import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button"; // Import Button component
import { Loader2 } from "lucide-react"; // Import a loader icon if needed


interface LanguageOption {
  value: string;
  label: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { value: "chinese", label: "Chinese", flag: "🇨🇳" },
  { value: "english", label: "English", flag: "🇬🇧" },
  { value: "japanese", label: "Japanese", flag: "🇯🇵" },
];

interface LanguageSettingsProps {
  nativeLanguage: string;
  setNativeLanguage: (value: string) => void;
  targetLanguage: string;
  setTargetLanguage: (value: string) => void;
  // Add a callback function for when the save button is clicked
  onSave: (nativeLanguage: string, targetLanguage: string) => Promise<void>; // Async function to handle saving
  isSaving: boolean; // Prop to indicate if saving is in progress (controlled by parent)  
}

export const LanguageSettings = ({
  nativeLanguage,
  setNativeLanguage,
  targetLanguage,
  setTargetLanguage,
  onSave, // Receive the onSave callback
  isSaving, // Receive the isSaving state  
}: LanguageSettingsProps) => {

  // Handler for the save button click
  const handleSaveClick = async () => {
    if (!isSaving) { // Only save if valid and not already saving
      await onSave(nativeLanguage, targetLanguage); // Call the parent's onSave function
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Language Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="native-language">Native Language</Label>
          <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
            <SelectTrigger id="native-language">
              <SelectValue placeholder="Select your native language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{lang.flag}</span>
                    {lang.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="target-language">Target Language</Label>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger id="target-language">
              <SelectValue placeholder="Select your target language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{lang.flag}</span>
                    {lang.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>    
      </div>
      {/* Add the Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveClick}
          disabled={isSaving} // Disable if not valid or currently saving
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            '更新'
          )}
        </Button>    
        </div>      
    </div>
  );
};