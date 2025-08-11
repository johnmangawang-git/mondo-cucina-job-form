import React from 'react';

const FormSection = ({ title, children, className = '' }) => {
    return (
        <div className={`form-section ${className}`}>
            <h2 className="form-section-title">{title}</h2>
            <div className="form-section-content">
                {children}
            </div>
        </div>
    );
};

export default FormSection;