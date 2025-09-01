import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import PerformanceMonitor from './PerformanceMonitor';

const DashboardLayout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check if device is mobile and auto-hide sidebar
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Auto-hide sidebar on mobile devices
            if (mobile) {
                setSidebarCollapsed(true);
            }
        };

        // Check on mount
        checkMobile();

        // Listen for window resize
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    // Auto-close sidebar when clicking main content on mobile
    const handleMainContentClick = () => {
        if (isMobile && !sidebarCollapsed) {
            setSidebarCollapsed(true);
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar 
                isCollapsed={sidebarCollapsed} 
                onToggle={toggleSidebar} 
            />
            
            <main 
                className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                onClick={handleMainContentClick}
            >
                {/* Mobile Menu Toggle */}
                <div className="mobile-header d-md-none">
                    <button 
                        className="btn btn-primary mobile-menu-toggle"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSidebar();
                        }}
                        aria-label={sidebarCollapsed ? 'Open Menu' : 'Close Menu'}
                    >
                        <i className={`bi ${sidebarCollapsed ? 'bi-list' : 'bi-x-lg'}`}></i>
                    </button>
                    <h6 className="mobile-title mb-0">Mondo Cucina</h6>
                    
                    {/* Mobile status indicator */}
                    {isMobile && (
                        <div className="mobile-status">
                            <small className="text-muted">
                                {sidebarCollapsed ? 'Tap menu to navigate' : 'Tap outside to close'}
                            </small>
                        </div>
                    )}
                </div>
                
                {/* Desktop Toggle Button */}
                <div className="desktop-toggle d-none d-md-block">
                    <button 
                        className="btn btn-outline-secondary btn-sm sidebar-toggle-btn"
                        onClick={toggleSidebar}
                        title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        <i className={`bi ${sidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
                    </button>
                </div>
                
                <div 
                    className="content-wrapper"
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
                
                {/* Performance Monitor - only in development */}
                <PerformanceMonitor enabled={import.meta.env.DEV} />
            </main>
        </div>
    );
};

export default DashboardLayout;