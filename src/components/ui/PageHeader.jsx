import React from 'react';
import BackButton from './BackButton';
import QuickNav from './QuickNav';

const PageHeader = ({ 
    title, 
    subtitle, 
    showBackButton = true, 
    backPath, 
    backLabel,
    rightContent,
    className = ''
}) => {
    return (
        <div className={`page-header ${className}`}>
            <div className="page-header-left">
                {showBackButton && (
                    <BackButton 
                        customPath={backPath} 
                        customLabel={backLabel}
                    />
                )}
                <div className="page-title-section">
                    <h1 className="page-title">{title}</h1>
                    {subtitle && <p className="page-subtitle">{subtitle}</p>}
                </div>
            </div>
            <div className="page-header-right">
                <QuickNav />
                {rightContent && rightContent}
            </div>
        </div>
    );
};

export default PageHeader;