import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            // Prevent the default prompt
            e.preventDefault();

            // Save the event for later use
            setDeferredPrompt(e);

            // Show the install prompt
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        // Optionally, send analytics event with outcome of user choice
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const dismissPrompt = () => {
        setShowPrompt(false);
        setDeferredPrompt(null);
    };

    if (!showPrompt) return null;

    return (
        <div className="pwa-install-prompt">
            <div className="pwa-install-content">
                <div className="pwa-install-icon">
                    <i className="fas fa-download"></i>
                </div>
                <div className="pwa-install-text">
                    <h3>Install Mondo Cucina App</h3>
                    <p>Add to your home screen for better experience</p>
                </div>
                <div className="pwa-install-buttons">
                    <button className="btn btn-secondary" onClick={dismissPrompt}>
                        Not Now
                    </button>
                    <button className="btn btn-primary" onClick={installApp}>
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;