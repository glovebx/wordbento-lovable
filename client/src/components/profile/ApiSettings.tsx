import { useState, useEffect } from "react"; // Import useState and useEffect for button disabled state and validation
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"; // Import Button component
import { Loader2 } from "lucide-react"; // Import a loader icon if needed

interface ApiSettingsProps {
  title: string;
  endpoint: string;
  setEndpoint: (value: string) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  isModelRequired: boolean; // 新增属性
  model?: string; // model 变为可选
  setModel?: (value: string) => void; // setModel 变为可选
  endpointId: string;
  apiKeyId: string;
  modelId?: string;
  // Add a callback function for when the save button is clicked
  onSave: (endpoint: string, apiKey: string, model?: string) => Promise<void>; // Async function to handle saving
  isSaving: boolean; // Prop to indicate if saving is in progress (controlled by parent)
}

export const ApiSettings = ({
  title,
  endpoint,
  setEndpoint,
  apiKey,
  setApiKey,
  isModelRequired, // 新增属性
  model, // model 变为可选
  setModel, // setModel 变为可选
  endpointId,
  apiKeyId,
  modelId,
  onSave, // Receive the onSave callback
  isSaving, // Receive the isSaving state
}: ApiSettingsProps) => {

  // State to track if the save button should be enabled
  const [canSave, setCanSave] = useState(false);

  // Effect to determine if the save button should be enabled
  // Enable if endpoint and apiKey are not empty
  useEffect(() => {
    const isValid = endpoint.trim() !== '' && apiKey.trim() !== '';
    setCanSave(isValid);
  }, [endpoint, apiKey, model]); // Dependencies: re-run when endpoint or apiKey changes


  // Handler for the save button click
  const handleSaveClick = async () => {
    if (canSave && !isSaving) { // Only save if valid and not already saving
      await onSave(endpoint, apiKey, model); // Call the parent's onSave function
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title} API Settings</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={endpointId}>{title} Endpoint</Label>
          <Input
            id={endpointId}
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder={`Enter ${title} API endpoint`}
            disabled={isSaving} // Disable input while saving
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={apiKeyId}>{title} API Key</Label>
          <Input
            id={apiKeyId}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter ${title} API key`}
            disabled={isSaving} // Disable input while saving
          />
        </div>

        {isModelRequired && (
          <div className="space-y-2">
            <Label htmlFor={modelId}>{title} Model</Label>
            <Input
              id={modelId}
              value={model}
              onChange={(e) => setModel?.(e.target.value)}
              placeholder={`Enter ${title} Model`}
              disabled={isSaving} // Disable input while saving
            />
          </div>
        )}

      </div>

      {/* Add the Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveClick}
          disabled={!canSave || isSaving} // Disable if not valid or currently saving
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
  );
};
