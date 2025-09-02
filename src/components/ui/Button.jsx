import React from 'react';

// Fresh Button component - rebuilt from scratch
const Button = (props) => {
    const {
        children,
        type = 'button',
        variant = 'primary',
        size = 'medium',
        disabled = false,
        onClick,
        className = '',
        ...rest
    } = props;

    // Simple class generation
    const baseClass = 'btn';
    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    const disabledClass = disabled ? 'btn-disabled' : '';
    
    const finalClassName = [baseClass, variantClass, sizeClass, disabledClass, className]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type={type}
            className={finalClassName}
            disabled={disabled}
            onClick={onClick}
            {...rest}
        >
            {children}
        </button>
    );
};

export default Button;