import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const OfflineStatus = () => {
    const isOnline = useOnlineStatus();

    return (
        <div className={`offline-status ${isOnline ? 'online' : 'offline'}`}>
            <div className="status-indicator">
                <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                <span className="status-text">
                    {isOnline ? 'Online' : 'Offline'}
                </span>
            </div>
            {!isOnline && (
                <div className="offline-message">
                    Data will sync when connection is restored
                </div>
            )}
        </div>
    );
};

export default OfflineStatus;