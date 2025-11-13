import { useState, useEffect } from 'react';

export const useDeviceDetection = () => {
    const [isDesktop, setIsDesktop] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            
            // Check for mobile devices
            const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
            const isMobileDevice = mobileRegex.test(userAgent);
            
            // Check for touch capability (another indicator of mobile)
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            // Screen size check
            const isSmallScreen = window.innerWidth <= 768;
            
            // Combine checks to determine device type
            // Consider as mobile if it's a mobile device OR has touch and small screen
            const mobile = isMobileDevice || (hasTouch && isSmallScreen);
            
            setIsMobile(mobile);
            setIsDesktop(!mobile);
        };

        checkDevice();
        
        // Add resize listener to update on window resize
        window.addEventListener('resize', checkDevice);
        
        return () => {
            window.removeEventListener('resize', checkDevice);
        };
    }, []);

    return { isDesktop, isMobile };
};