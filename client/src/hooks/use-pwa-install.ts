import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): Promise<void>;
}

const isIOS = () => {
  // Modern way to check for iOS, avoiding the deprecated navigator.platform
  // This regex is a common and robust way to identify Apple mobile devices.
  const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // This part is a clever trick to identify iPads on recent versions of iPadOS
  // that report as a Mac. We should keep it.
  const isModernIPad = navigator.userAgent.includes("Mac") && "ontouchend" in document;

  return isAppleDevice || isModernIPad;
}

export const isInStandaloneMode = () => {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // @ts-ignore
  if (window.navigator.standalone) {
    return true;
  }
  return false;
};

export const usePwaInstall = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOSUser, setIsIOSUser] = useState(false);
  const [showIOSTutorial, setShowIOSTutorial] = useState(false);

  useEffect(() => {
    const isStandalone = isInStandaloneMode();
    const onIOS = isIOS();
    setIsIOSUser(onIOS);

    // If already in standalone mode, never show the button.
    if (isStandalone) {
      setShowInstallButton(false);
      return;
    }

    // On iOS, if not standalone, always show the button to trigger the tutorial.
    if (onIOS) {
      setShowInstallButton(true);
    } else {
      // On other platforms (Android/Desktop), wait for the beforeinstallprompt event.
      const handleBeforeInstallPrompt = (event: Event) => {
        event.preventDefault();
        setInstallPromptEvent(event as BeforeInstallPromptEvent);
        setShowInstallButton(true);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const promptInstall = useCallback(async () => {
    if (isIOSUser) {
        setShowIOSTutorial(true);
        return;
    }

    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    
    setInstallPromptEvent(null);
    setShowInstallButton(false);
  }, [installPromptEvent, isIOSUser]);

  return { 
    promptInstall, 
    showInstallButton, 
    showIOSTutorial, 
    setShowIOSTutorial 
  };
};