import { useState, useEffect } from 'react';

const useIsTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if the browser supports touch events. This is the most reliable way.
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // An additional check for modern iPads that might identify as Mac
    const isModernIPad = navigator.userAgent.includes("Mac") && "ontouchend" in document;

    setIsTouchDevice(hasTouchSupport || isModernIPad);
  }, []);

  return isTouchDevice;
};

export default useIsTouchDevice;
