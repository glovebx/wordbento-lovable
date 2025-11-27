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
  active?: boolean;
  setActive: (value: boolean) => void; // setModel 变为可选
  endpointId: string;
  apiKeyId: string;
  modelId?: string;
  activeId?: string;
  // Add a callback function for when the save button is clicked
  onSave: (endpoint: string, apiKey: string, model?: string, active?: boolean) => Promise<void>; // Async function to handle saving
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
  active,
  setActive,
  endpointId,
  apiKeyId,
  modelId,
  activeId,
  onSave, // Receive the onSave callback
  isSaving, // Receive the isSaving state
}: ApiSettingsProps) => {

  // State to track if the save button should be enabled
  const [canSave, setCanSave] = useState(false);

  // Effect to determine if the save button should be enabled
  // Enable if endpoint and apiKey are not empty
  useEffect(() => {
    const isValid = endpoint.trim() !== '' && apiKey.trim() !== '' && ((isModelRequired && model?.trim() !== '') || !isModelRequired);
    setCanSave(isValid);
  }, [endpoint, apiKey, model]); // Dependencies: re-run when endpoint or apiKey changes


  // Handler for the save button click
  const handleSaveClick = async () => {
    if (canSave && !isSaving) { // Only save if valid and not already saving
      await onSave(endpoint, apiKey, model, active); // Call the parent's onSave function
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

        {/* 新增 Active 开关 - Tailwind版本 */}
        <div className="space-y-2">
          {/* <Label htmlFor={activeId}>Active</Label> */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              id={activeId}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                active ? 'bg-blue-600' : 'bg-gray-200'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !isSaving && setActive(!active)}
              disabled={isSaving}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">
              {active ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

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
            '更新'
          )}
        </Button>
      </div>
    </div>
  );
};
