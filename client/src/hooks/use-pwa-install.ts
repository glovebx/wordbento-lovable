import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): Promise<void>;
}

const isIOS = () => {
  const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
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
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [isNonStandardBrowser, setIsNonStandardBrowser] = useState(false);

  useEffect(() => {
    // PWA can only be installed in secure contexts (HTTPS or localhost)
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      setShowInstallButton(false);
      return;
    }

    const isStandalone = isInStandaloneMode();
    if (isStandalone) {
      setShowInstallButton(false);
      return;
    }

    const onIOS = isIOS();
    setIsIOSUser(onIOS);

    if (onIOS) {
      setShowInstallButton(true);
      return;
    }

    let promptHandled = false;
    const handleBeforeInstallPrompt = (event: Event) => {
      promptHandled = true;
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback for non-standard browsers (like Huawei's)
    const timer = setTimeout(() => {
        if (!promptHandled) {
            setIsNonStandardBrowser(true);
            setShowInstallButton(true);
        }
    }, 3000); // Wait 3 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (isIOSUser) {
      setShowIOSTutorial(true);
      return;
    }

    if (isNonStandardBrowser) {
      setShowAndroidGuide(true);
      return;
    }

    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    
    setInstallPromptEvent(null);
    setShowInstallButton(false);
  }, [installPromptEvent, isIOSUser, isNonStandardBrowser]);

  return { 
    promptInstall, 
    showInstallButton, 
    showIOSTutorial, 
    setShowIOSTutorial, 
    showAndroidGuide,
    setShowAndroidGuide,
    isNonStandardBrowser // Export this to change button text if needed
  };
};