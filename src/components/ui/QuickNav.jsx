import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from './Button';

const QuickNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showNav, setShowNav] = useState(false);

    const navItems = [
        { path: '/form', label: '📝 New Job Order', icon: '📝' },
        { path: '/admin', label: '📊 Dashboard', icon: '📊' },
        { path: '/debug', label: '🔧 Debug Data', icon: '🔧' },
        { path: '/login', label: '🔐 Login', icon: '🔐' }
    ];

    const currentItem = navItems.find(item => item.path === location.pathname);

    return (
        <div className="quick-nav">
            <Button
                variant="outline"
                size="small"
                onClick={() => setShowNav(!showNav)}
                className="nav-toggle"
            >
                🧭 Menu {showNav ? '▲' : '▼'}
            </Button>
            
            {showNav && (
                <div className="nav-dropdown">
                    <div className="nav-current">
                        <small>Current: {currentItem?.label || 'Unknown'}</small>
                    </div>
                    <div className="nav-items">
                        {navItems
                            .filter(item => item.path !== location.pathname)
                            .map(item => (
                                <button
                                    key={item.path}
                                    className="nav-item"
                                    onClick={() => {
                                        navigate(item.path);
                                        setShowNav(false);
                                    }}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    <span className="nav-label">{item.label.replace(item.icon + ' ', '')}</span>
                                </button>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickNav;