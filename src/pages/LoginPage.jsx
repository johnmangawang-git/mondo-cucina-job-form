import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import BackButton from '../components/ui/BackButton';
import { supabase } from '../api/supabase';

const LoginPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;

            // Redirect to admin page on successful login
            navigate('/admin');
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-back-button">
                    <BackButton customPath="/admin" customLabel="← Back to Dashboard" />
                </div>
                <div className="login-header">
                    <h1>Mondo Cucina</h1>
                    <p>Job Order System</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={loading}
                        className="login-btn"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                </form>

                <div className="login-footer">
                    <p>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/form')}
                        >
                            Continue as Guest
                        </Button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;