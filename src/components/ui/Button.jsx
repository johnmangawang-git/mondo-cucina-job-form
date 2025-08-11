import React from 'react';

const Button = ({ 
    children, 
    type = 'button', 
    variant = 'primary', 
    size = 'medium',
    disabled = false,
    onClick,
    className = '',
    ...props 
}) => {
    const baseClasses = 'btn';
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'btn-danger',
        outline: 'btn-outline',
        success: 'btn-success'
    };
    const sizeClasses = {
        small: 'btn-small',
        medium: 'btn-medium',
        large: 'btn-large'
    };

    const classes = [
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled ? 'btn-disabled' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;