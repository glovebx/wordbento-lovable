import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

import { LanguageSettings } from "@/components/profile/LanguageSettings";
import { ApiSettings } from "@/components/profile/ApiSettings";

// 引入 useLlms Hook 及其类型
import { useLlms, Llm, SaveLlmData } from '@/hooks/use-llm'; // 假设 use-llms 路径正确

// --- 类型定义 ---

// 扩展前端 ApiConfig 接口以匹配 Llm 后端数据结构，并包含前端配置信息
interface BaseApiConfig {
    platform: Llm['platform'] | 'scraper'; // 包含 scraper
    title: string;
    description: string;
    isModelRequired: boolean;
}

// 包含后端数据的完整 API 配置状态
type ApiConfigState = BaseApiConfig & {
    // LLM 后端数据
    id?: number; // 数据库 ID，新增时可能没有
    endpoint: string;
    apiKey: string;
    model?: string;
};

// // 更新 ApiConfig 类型，添加 isModelRequired 属性
// interface ApiConfig {
//     platform: string;
//     title: string;
//     description: string;
//     endpoint: string;
//     apiKey: string;
//     isModelRequired: boolean;
//     model?: string; // model 字段现在是可选的
// }

const initialApis: BaseApiConfig[] = [
    {
        platform: "gemini",
        title: "Gemini",
        description: "for general text.",
        isModelRequired: true,
    },
    {
        platform: "deepseek",
        title: "DeepSeek",
        description: "for professional text.",
        isModelRequired: true,
    },
    {
        platform: "jimeng",
        title: "Jimeng",
        description: "for image creation.",
        isModelRequired: true,
    },
    {
        platform: "scraper",
        title: "Scraper",
        description: "for data extraction.",
        isModelRequired: false
    }
];

// // Helper function to create initial state from a list of APIs
// const createInitialState = (apis: ApiConfig[]) => {
//     return apis.reduce((acc, api) => {
//         acc[api.platform] = {
//             endpoint: api.endpoint,
//             apiKey: api.apiKey,
//             ...(api.isModelRequired && { model: api.model }) // 仅在需要时添加 model
//         };
//         return acc;
//     }, {} as Record<string, any>);
// };

// const createInitialSavingState = (apis: ApiConfig[]) => {
//     return apis.reduce((acc, api) => {
//         acc[api.platform] = false;
//         return acc;
//     }, {} as Record<string, boolean>);
// };

// const UserProfile = () => {
//     const [apiConfigs, setApiConfigs] = useState(createInitialState(initialApis));
//     const [isSaving, setIsSaving] = useState(createInitialSavingState(initialApis));
//     const [languageSettings, setLanguageSettings] = useState({
//         nativeLanguage: "chinese",
//         targetLanguage: "english",
//         isSaving: false
//     });

//     const handleSaveLanguageSettings = async () => {
//         setLanguageSettings(prev => ({ ...prev, isSaving: true }));
//         console.log("Saving Language Settings:", languageSettings);
//         await new Promise(resolve => setTimeout(resolve, 1000));
//         setLanguageSettings(prev => ({ ...prev, isSaving: false }));
//         toast({
//             title: "Language Settings Saved",
//             description: "Your language settings have been updated.",
//         });
//     };

//     // This generic handler now accepts an optional model field
//     const handleSaveApiSettings = async (id: string, newConfig: { endpoint: string, apiKey: string, model?: string }) => {
//         setIsSaving(prev => ({ ...prev, [id]: true }));
        
//         console.log(`Saving ${id} Settings:`, newConfig);
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//         setApiConfigs(prev => ({ ...prev, [id]: newConfig }));
//         setIsSaving(prev => ({ ...prev, [id]: false }));
        
//         toast({
//             title: `${id.charAt(0).toUpperCase() + id.slice(1)} Settings Saved`,
//             description: `Your ${id} API settings have been updated.`,
//         });
//     };

//     return (
//         <div className="p-6 relative">
//             <div className="absolute top-4 right-4 z-30">
//                 <Button variant="outline" asChild>
//                     <Link to="/" className="flex items-center gap-2">
//                         <Home className="h-4 w-4" />
//                         Back to Home
//                     </Link>
//                 </Button>
//             </div>
            
//             <div className="space-y-16 mt-12">
//                 <div id="language-section" className="scroll-mt-12">
//                     <LanguageSettings 
//                         nativeLanguage={languageSettings.nativeLanguage}
//                         setNativeLanguage={(lang) => setLanguageSettings(prev => ({ ...prev, nativeLanguage: lang }))}
//                         targetLanguage={languageSettings.targetLanguage}
//                         setTargetLanguage={(lang) => setLanguageSettings(prev => ({ ...prev, targetLanguage: lang }))}
//                         onSave={handleSaveLanguageSettings}
//                         isSaving={languageSettings.isSaving}
//                     />
//                 </div>
                
//                 {initialApis.map(api => (
//                     <div key={api.platform} id={`${api.platform}-section`} className="scroll-mt-12">
//                         <ApiSettings 
//                             title={api.title}
//                             endpoint={apiConfigs[api.platform].endpoint}
//                             setEndpoint={(val) => setApiConfigs(prev => ({ ...prev, [api.platform]: { ...prev[api.platform], endpoint: val } }))}
//                             apiKey={apiConfigs[api.platform].apiKey}
//                             setApiKey={(val) => setApiConfigs(prev => ({ ...prev, [api.platform]: { ...prev[api.platform], apiKey: val } }))}
//                             endpointId={`${api.platform}-endpoint`}
//                             apiKeyId={`${api.platform}-api-key`}
//                             onSave={(endpoint, apiKey, model) => handleSaveApiSettings(api.platform, { endpoint, apiKey, model })}
//                             isSaving={isSaving[api.platform]}
//                             // 根据 isModelRequired 属性动态传递 model 相关 props
//                             isModelRequired={api.isModelRequired}
//                             model={apiConfigs[api.platform]?.model}
//                             setModel={api.isModelRequired ? (val) => setApiConfigs(prev => ({ ...prev, [api.platform]: { ...prev[api.platform], model: val } })) : undefined}
//                             modelId={`${api.platform}-model`}
//                         />
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default UserProfile;
// --- 辅助函数：将后端数据与默认配置合并 ---

/**
 * 将初始配置、后端数据与前端状态进行合并，并初始化 isSaving 状态。
 * @param initialConfigs 默认的 API 配置列表
 * @param llmList 后端获取的 Llm 列表
 * @returns [合并后的配置状态, isSaving 初始状态]
 */
const mergeConfigAndInitState = (
    initialConfigs: BaseApiConfig[], 
    llmList: Llm[]
): [Record<string, ApiConfigState>, Record<string, boolean>] => {
    const mergedState: Record<string, ApiConfigState> = {};
    const savingState: Record<string, boolean> = {};

    // 将后端数据转换为以 platform 为 key 的 Map
    const llmMap = new Map(llmList.map(llm => [llm.platform, llm]));

    initialConfigs.forEach(config => {
        const backendLlm = llmMap.get(config.platform);
        
        // 核心合并逻辑：后端数据覆盖前端默认值
        const mergedConfig: ApiConfigState = {
            ...config,
            // 从后端获取或使用空字符串作为默认值
            id: backendLlm?.id,
            endpoint: backendLlm?.endpoint || "",
            apiKey: backendLlm?.token || "", // 注意：后端是 token，前端可能是 apiKey
            model: backendLlm?.model || "",
        };

        // 确保非 Model Required 的配置不包含 model 字段（尽管可选类型可以忽略）
        if (!config.isModelRequired) {
             delete mergedConfig.model;
        }

        mergedState[config.platform] = mergedConfig;
        savingState[config.platform] = false;
    });

    return [mergedState, savingState];
};


const UserProfile = () => {
    // 假设 isAuthenticated 状态在父级提供，这里简化为 true 以便测试 useLlms
    const isAuthenticated = true; 
    
    // 使用 useLlms Hook
    const { 
        recentLlms, 
        isLoading: isLlmsLoading, 
        saveLlm, 
        isSaving: isLlmSaving 
    } = useLlms(isAuthenticated);

    // 状态初始化为默认值，等待后端数据加载
    const [apiConfigs, setApiConfigs] = useState<Record<string, ApiConfigState>>(() => 
        mergeConfigAndInitState(initialApis, [])[0]
    );
    const [isSaving, setIsSaving] = useState<Record<string, boolean>>(() => 
        mergeConfigAndInitState(initialApis, [])[1]
    );

    const [languageSettings, setLanguageSettings] = useState({
        nativeLanguage: "chinese",
        targetLanguage: "english",
        isSaving: false
    });

    // --- EFFECT: 合并后端数据到前端状态 ---
    useEffect(() => {
        if (!isLlmsLoading && recentLlms.length > 0) {
            console.log("LLMs loaded, merging state:", recentLlms);
            const [mergedConfigs, initialSavingState] = mergeConfigAndInitState(initialApis, recentLlms);
            setApiConfigs(mergedConfigs);
            setIsSaving(initialSavingState); // 刷新 isSaving 状态
        }
    }, [recentLlms, isLlmsLoading]);


    const handleSaveLanguageSettings = async () => {
        setLanguageSettings(prev => ({ ...prev, isSaving: true }));
        console.log("Saving Language Settings:", languageSettings);
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLanguageSettings(prev => ({ ...prev, isSaving: false }));
        toast({
            title: "Language Settings Saved",
            description: "Your language settings have been updated.",
        });
    };

    // --- 优化后的 API 配置保存处理器 ---
    const handleSaveApiSettings = useCallback(async (
        platform: Llm['platform'], 
        newConfig: { endpoint: string, apiKey: string, model?: string }
    ) => {
        // // 对于 Scraper 等不属于 Llm 模型的，仅进行前端状态更新或调用其他 API
        // if (platform === 'scraper') {
        //      // 模拟 scraper 保存逻辑
        //     setIsSaving(prev => ({ ...prev, [platform]: true }));
        //     await new Promise(resolve => setTimeout(resolve, 1000));
        //     setApiConfigs(prev => ({ ...prev, [platform]: { ...prev[platform], ...newConfig } }));
        //     setIsSaving(prev => ({ ...prev, [platform]: false }));
        //     toast({
        //         title: "Scraper Settings Saved",
        //         description: "Your Scraper API settings have been updated.",
        //     });
        //     return;
        // }

        const currentConfig = apiConfigs[platform];
        
        // 构造符合 useLlms saveLlm 预期的 SaveLlmData/Llm 数据结构
        const dataToSave: SaveLlmData = {
            id: currentConfig.id, // 关键：带上 ID 进行更新，没有 ID 时为新建
            platform: platform as Llm['platform'],
            endpoint: newConfig.endpoint,
            token: newConfig.apiKey, // 关键：将前端的 apiKey 映射为后端的 token
            model: newConfig.model || '',
        };

        // 调用 useLlms 提供的 saveLlm 函数
        const success = await saveLlm(dataToSave);

        // useLlms 内部的 saveLlm 已经处理了 isSaving 状态和 Toast 提示
        
        if (success) {
            // 注意：因为 saveLlm 成功后会触发 useLlms 内部的 fetchLlms，
            // 进而更新 recentLlms，最终触发本组件的 useEffect 来合并和更新 apiConfigs 状态。
            // 因此，这里无需手动 setApiConfigs，实现了数据流的单向性。
        } else {
            console.error(`Failed to save ${platform} settings.`);
            // 错误信息已在 useLlms 内部的 toast 中显示
        }
    }, [apiConfigs, saveLlm]); // 依赖 apiConfigs 以获取 ID

    // 渲染时判断是否正在初始加载 LLMs
    const isInitialLoading = isLlmsLoading && recentLlms.length === 0;

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

                {/* 加载提示 */}
                {isInitialLoading && (
                    <p className="text-gray-500">Loading API configurations...</p>
                )}
                
                {/* API 设置列表 */}
                {!isInitialLoading && initialApis.map(api => {
                    const currentConfig = apiConfigs[api.platform];
                    if (!currentConfig) return null; // 确保配置已加载
                    
                    return (
                        <div key={api.platform} id={`${api.platform}-section`} className="scroll-mt-12">
                            <ApiSettings 
                                title={api.title}
                                endpoint={currentConfig.endpoint}
                                setEndpoint={(val) => setApiConfigs(prev => ({ ...prev, [api.platform]: { ...prev[api.platform], endpoint: val } }))}
                                apiKey={currentConfig.apiKey}
                                setApiKey={(val) => setApiConfigs(prev => ({ ...prev, [api.platform]: { ...prev[api.platform], apiKey: val } }))}
                                endpointId={`${api.platform}-endpoint`}
                                apiKeyId={`${api.platform}-api-key`}
                                onSave={(endpoint, apiKey, model) => handleSaveApiSettings(api.platform, { endpoint, apiKey, model })}
                                // 使用 useLlms 的 isSaving 状态
                                isSaving={isLlmSaving || isSaving[api.platform]} 
                                
                                isModelRequired={api.isModelRequired}
                                model={currentConfig.model}
                                setModel={api.isModelRequired ? (val) => setApiConfigs(prev => ({ ...prev, [api.platform]: { ...prev[api.platform], model: val } })) : undefined}
                                modelId={`${api.platform}-model`}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UserProfile;