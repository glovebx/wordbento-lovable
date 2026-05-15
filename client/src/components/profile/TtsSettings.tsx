import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { axiosPrivate } from "@/lib/axios";

interface VoiceOption {
    value: string;
    label: string;
}

const TTS_SETTINGS_KEY = 'tts_settings';

interface TtsSettingsData {
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
}

export const TtsSettings = () => {
    const [voices, setVoices] = useState<VoiceOption[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [settings, setSettings] = useState<TtsSettingsData>(() => {
        const savedSettings = localStorage.getItem(TTS_SETTINGS_KEY);
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        return {
            voice: 'en-US-AriaNeural',
            rate: 0,
            pitch: 0,
            volume: 0,
        };
    });

    useEffect(() => {
        const fetchVoices = async () => {
            setIsLoadingVoices(true);
            try {
                const response = await axiosPrivate.get('/api/word/voices');
                const data = response.data;
                const formattedVoices = data.map((voice: any) => ({
                    value: voice.ShortName,
                    label: `${voice.Name} (${voice.Locale})`
                }));
                setVoices(formattedVoices);
            } catch (error) {
                console.error("Error fetching TTS voices:", error);
                // Optionally, set some default/fallback voices here
            } finally {
                setIsLoadingVoices(false);
            }
        };

        fetchVoices();
    }, []);

    useEffect(() => {
        localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings));
    }, [settings]);

    const handleValueChange = (key: keyof TtsSettingsData, value: string | number) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>TTS 语音合成</CardTitle>
                <CardDescription>调整文本转语音的发音效果。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="tts-voice">音色 (Voice)</Label>
                    <Select 
                        value={settings.voice} 
                        onValueChange={(value) => handleValueChange('voice', value)}
                        disabled={isLoadingVoices}
                    >
                        <SelectTrigger id="tts-voice">
                            <SelectValue placeholder={isLoadingVoices ? "加载音色中..." : "选择音色"} />
                        </SelectTrigger>
                        <SelectContent>
                            {voices.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tts-rate">语速 (Rate): {settings.rate}%</Label>
                    <Slider
                        id="tts-rate"
                        min={-100}
                        max={100}
                        step={10}
                        value={[settings.rate]}
                        onValueChange={([value]) => handleValueChange('rate', value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tts-pitch">音高 (Pitch): {settings.pitch}%</Label>
                    <Slider
                        id="tts-pitch"
                        min={-100}
                        max={100}
                        step={10}
                        value={[settings.pitch]}
                        onValueChange={([value]) => handleValueChange('pitch', value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tts-volume">音量 (Volume): {settings.volume}%</Label>
                    <Slider
                        id="tts-volume"
                        min={-100}
                        max={100}
                        step={10}
                        value={[settings.volume]}
                        onValueChange={([value]) => handleValueChange('volume', value)}
                    />
                </div>
            </CardContent>
        </Card>
    );
};
