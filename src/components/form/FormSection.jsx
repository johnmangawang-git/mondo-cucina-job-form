import React from 'react';

const FormSection = ({ title, children, className = '' }) => {
    return (
        <div className={`card mb-4 ${className}`}>
            <div className="card-header bg-light">
                <h5 className="card-title mb-0">
                    <i className="bi bi-list-ul me-2 text-primary"></i>
                    {title}
                </h5>
            </div>
            <div className="card-body">
                {children}
            </div>
        </div>
    );
};

export default FormSection;