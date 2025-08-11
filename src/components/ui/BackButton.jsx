import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from './Button';

const BackButton = ({ customPath, customLabel }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleBack = () => {
        if (customPath) {
            navigate(customPath);
        } else {
            // Smart back navigation based on current page
            switch (location.pathname) {
                case '/form':
                    navigate('/admin');
                    break;
                case '/debug':
                    navigate('/admin');
                    break;
                case '/login':
                    navigate('/admin');
                    break;
                case '/admin':
                    navigate('/form');
                    break;
                default:
                    navigate(-1); // Browser back
            }
        }
    };

    const getBackLabel = () => {
        if (customLabel) return customLabel;
        
        switch (location.pathname) {
            case '/form':
                return '← Back to Dashboard';
            case '/debug':
                return '← Back to Dashboard';
            case '/login':
                return '← Back to Dashboard';
            case '/admin':
                return '← Back to Form';
            default:
                return '← Back';
        }
    };

    return (
        <Button
            variant="outline"
            size="small"
            onClick={handleBack}
            className="back-button"
        >
            {getBackLabel()}
        </Button>
    );
};

export default BackButton;