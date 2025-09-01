import React, { useState } from 'react';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="dashboard-layout">
            <Sidebar 
                isCollapsed={sidebarCollapsed} 
                onToggle={toggleSidebar} 
            />
            
            <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Mobile Menu Toggle */}
                <div className="mobile-header d-md-none">
                    <button 
                        className="btn btn-outline-primary mobile-menu-toggle"
                        onClick={toggleSidebar}
                        aria-label="Open Menu"
                    >
                        <i className="bi bi-list"></i>
                    </button>
                    <h6 className="mobile-title mb-0">Mondo Cucina</h6>
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
                
                <div className="content-wrapper">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;