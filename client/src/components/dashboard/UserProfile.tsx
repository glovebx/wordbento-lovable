import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

import { LanguageSettings } from "@/components/profile/LanguageSettings";
import { ApiSettings } from "@/components/profile/ApiSettings";

// 更新 ApiConfig 类型，添加 isModelRequired 属性
interface ApiConfig {
    id: string;
    title: string;
    description: string;
    endpoint: string;
    apiKey: string;
    isModelRequired: boolean;
    model?: string; // model 字段现在是可选的
}

const initialApis: ApiConfig[] = [
    {
        id: "gemini",
        title: "Gemini",
        description: "for general text.",
        endpoint: "",
        apiKey: "",
        isModelRequired: true,
        model: ""
    },
    {
        id: "deepseek",
        title: "DeepSeek",
        description: "for professional text.",
        endpoint: "",
        apiKey: "",
        isModelRequired: true,
        model: ""
    },
    {
        id: "jimeng",
        title: "Jimeng",
        description: "for image creation.",
        endpoint: "",
        apiKey: "",
        isModelRequired: true,
        model: ""
    },
    {
        id: "scraper",
        title: "Scraper",
        description: "for data extraction.",
        endpoint: "",
        apiKey: "",
        isModelRequired: false
    }
];

// Helper function to create initial state from a list of APIs
const createInitialState = (apis: ApiConfig[]) => {
    return apis.reduce((acc, api) => {
        acc[api.id] = {
            endpoint: api.endpoint,
            apiKey: api.apiKey,
            ...(api.isModelRequired && { model: api.model }) // 仅在需要时添加 model
        };
        return acc;
    }, {} as Record<string, any>);
};

const createInitialSavingState = (apis: ApiConfig[]) => {
    return apis.reduce((acc, api) => {
        acc[api.id] = false;
        return acc;
    }, {} as Record<string, boolean>);
};

const UserProfile = () => {
    const [apiConfigs, setApiConfigs] = useState(createInitialState(initialApis));
    const [isSaving, setIsSaving] = useState(createInitialSavingState(initialApis));
    const [languageSettings, setLanguageSettings] = useState({
        nativeLanguage: "chinese",
        targetLanguage: "english",
        isSaving: false
    });

    const handleSaveLanguageSettings = async () => {
        setLanguageSettings(prev => ({ ...prev, isSaving: true }));
        console.log("Saving Language Settings:", languageSettings);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLanguageSettings(prev => ({ ...prev, isSaving: false }));
        toast({
            title: "Language Settings Saved",
            description: "Your language settings have been updated.",
        });
    };

    // This generic handler now accepts an optional model field
    const handleSaveApiSettings = async (id: string, newConfig: { endpoint: string, apiKey: string, model?: string }) => {
        setIsSaving(prev => ({ ...prev, [id]: true }));
        
        console.log(`Saving ${id} Settings:`, newConfig);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setApiConfigs(prev => ({ ...prev, [id]: newConfig }));
        setIsSaving(prev => ({ ...prev, [id]: false }));
        
        toast({
            title: `${id.charAt(0).toUpperCase() + id.slice(1)} Settings Saved`,
            description: `Your ${id} API settings have been updated.`,
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
                <div id="language-section" className="scroll-mt-12">
                    <LanguageSettings 
                        nativeLanguage={languageSettings.nativeLanguage}
                        setNativeLanguage={(lang) => setLanguageSettings(prev => ({ ...prev, nativeLanguage: lang }))}
                        targetLanguage={languageSettings.targetLanguage}
                        setTargetLanguage={(lang) => setLanguageSettings(prev => ({ ...prev, targetLanguage: lang }))}
                        onSave={handleSaveLanguageSettings}
                        isSaving={languageSettings.isSaving}
                    />
                </div>
                
                {initialApis.map(api => (
                    <div key={api.id} id={`${api.id}-section`} className="scroll-mt-12">
                        <ApiSettings 
                            title={api.title}
                            endpoint={apiConfigs[api.id].endpoint}
                            setEndpoint={(val) => setApiConfigs(prev => ({ ...prev, [api.id]: { ...prev[api.id], endpoint: val } }))}
                            apiKey={apiConfigs[api.id].apiKey}
                            setApiKey={(val) => setApiConfigs(prev => ({ ...prev, [api.id]: { ...prev[api.id], apiKey: val } }))}
                            endpointId={`${api.id}-endpoint`}
                            apiKeyId={`${api.id}-api-key`}
                            onSave={(endpoint, apiKey, model) => handleSaveApiSettings(api.id, { endpoint, apiKey, model })}
                            isSaving={isSaving[api.id]}
                            // 根据 isModelRequired 属性动态传递 model 相关 props
                            isModelRequired={api.isModelRequired}
                            model={apiConfigs[api.id]?.model}
                            setModel={api.isModelRequired ? (val) => setApiConfigs(prev => ({ ...prev, [api.id]: { ...prev[api.id], model: val } })) : undefined}
                            modelId={`${api.id}-model`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserProfile;