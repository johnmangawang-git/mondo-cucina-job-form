import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const Sidebar = ({ isCollapsed, onToggle }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { getPendingJobOrders } = useOfflineStorage();
    const isOnline = useOnlineStatus();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const loadPendingCount = async () => {
            try {
                const pending = await getPendingJobOrders();
                setPendingCount(pending?.length || 0);
            } catch (error) {
                console.error('Error loading pending count:', error);
            }
        };
        
        loadPendingCount();
        // Update count every 30 seconds
        const interval = setInterval(loadPendingCount, 30000);
        return () => clearInterval(interval);
    }, [getPendingJobOrders]);

    const menuItems = [
        {
            path: '/admin',
            icon: 'bi-speedometer2',
            label: 'Dashboard',
            description: 'View all job orders'
        },
        {
            path: '/form',
            icon: 'bi-file-earmark-plus',
            label: 'New Job Order',
            description: 'Create new job order'
        },
        {
            path: '/debug',
            icon: 'bi-bug',
            label: 'Debug Data',
            description: 'Debug information'
        }
    ];

    const isActivePath = (path) => {
        return location.pathname === path;
    };

    const handleNavigation = (path) => {
        navigate(path);
        // Auto-close sidebar on mobile after navigation
        if (window.innerWidth < 768) {
            setTimeout(() => onToggle(), 150); // Small delay for smooth UX
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {!isCollapsed && (
                <div 
                    className="sidebar-overlay d-md-none"
                    onClick={onToggle}
                ></div>
            )}
            
            {/* Sidebar */}
            <div 
                className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Brand Header */}
                <div className="sidebar-header">
                    <div className="brand-container">
                        <div className="brand-icon">
                            <i className="bi bi-building"></i>
                        </div>
                        {!isCollapsed && (
                            <div className="brand-text">
                                <h5 className="brand-title">Mondo Cucina</h5>
                                <small className="brand-subtitle">Job Management</small>
                            </div>
                        )}
                    </div>
                    <button 
                        className="sidebar-toggle d-md-none"
                        onClick={onToggle}
                        aria-label="Toggle Sidebar"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                {/* Connection Status */}
                <div className="connection-status">
                    <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
                        <i className={`bi ${isOnline ? 'bi-wifi' : 'bi-wifi-off'}`}></i>
                        {!isCollapsed && (
                            <span className="status-text">
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        )}
                    </div>
                    {pendingCount > 0 && !isCollapsed && (
                        <div className="pending-indicator">
                            <i className="bi bi-clock-history"></i>
                            <span>{pendingCount} pending sync</span>
                        </div>
                    )}
                </div>

                {/* Navigation Menu */}
                <nav className="sidebar-nav">
                    <ul className="nav-list">
                        {menuItems.map((item) => {
                            const isActive = isActivePath(item.path);
                            return (
                                <li key={item.path} className="nav-item">
                                    <button
                                        className={`nav-link ${isActive ? 'active' : ''}`}
                                        onClick={() => handleNavigation(item.path)}
                                        title={isCollapsed ? item.label : item.description}
                                    >
                                        <div className="nav-icon">
                                            <i className={item.icon}></i>
                                        </div>
                                        {!isCollapsed && (
                                            <div className="nav-content">
                                                <span className="nav-label">{item.label}</span>
                                                <small className="nav-description">{item.description}</small>
                                            </div>
                                        )}
                                        {item.path === '/admin' && pendingCount > 0 && (
                                            <span className="badge bg-warning rounded-pill">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    {!isCollapsed && (
                        <div className="footer-content">
                            <small className="text-muted">
                                Version 1.0.0
                            </small>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sidebar;