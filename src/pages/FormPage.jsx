import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormSection from '../components/form/FormSection';
import SignaturePad from '../components/form/SignaturePad';
import MediaUpload from '../components/form/MediaUpload';
import OfflineStatus from '../components/form/OfflineStatus';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { useOfflineStorage } from '../hooks/useOfflineStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { supabase } from '../api/supabase';
import { convertFilesToBase64 } from '../utils/exportUtils';

const FormPage = () => {
    const navigate = useNavigate();
    const { saveJobOrder } = useOfflineStorage();
    const isOnline = useOnlineStatus();
    
    const [formData, setFormData] = useState({
        caseNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
        customerName: '',
        customerAddress: '',
        customerEmail: '',
        sku: '',
        coverage: [],
        complaintDetails: '',
        dispatchDate: '',
        dispatchTime: '',
        testedBefore: false,
        testedAfter: false,
        troublesFound: 0,
        otherNotes: '',
        mediaFiles: [],
        signatureData: null,
        termsAccepted: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.caseNumber.trim()) newErrors.caseNumber = 'Case number is required';
        if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
        if (!formData.customerAddress.trim()) newErrors.customerAddress = 'Customer address is required';
        if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
        if (formData.coverage.length === 0) newErrors.coverage = 'Coverage type is required';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';
        
        if (formData.customerEmail && !/\S+@\S+\.\S+/.test(formData.customerEmail)) {
            newErrors.customerEmail = 'Please enter a valid email address';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        
        // Media files are already converted to base64 in MediaUpload component
        const convertedMediaFiles = formData.mediaFiles;
        
        try {
            
            // Map form data to database field names
            const jobOrderData = {
                case_number: formData.caseNumber,
                order_date: formData.orderDate,
                customer_name: formData.customerName,
                customer_address: formData.customerAddress,
                customer_email: formData.customerEmail,
                sku: formData.sku,
                coverage: formData.coverage,
                complaint_details: formData.complaintDetails,
                dispatch_date: formData.dispatchDate || null,
                dispatch_time: formData.dispatchTime || null,
                tested_before: formData.testedBefore,
                tested_after: formData.testedAfter,
                troubles_found: formData.troublesFound,
                other_notes: formData.otherNotes,
                media_urls: convertedMediaFiles.map(file => file.data), // Map mediaFiles to media_urls
                signature_url: formData.signatureData, // Map signatureData to signature_url
                terms_accepted: formData.termsAccepted,
                status: isOnline ? 'synced' : 'pending',
                created_at: new Date().toISOString()
            };
            
            console.log('Saving job order with signature:', formData.signatureData ? 'YES' : 'NO');
            console.log('Saving job order with media files:', convertedMediaFiles.length);
            
            if (isOnline) {
                const { error } = await supabase
                    .from('job_orders')
                    .insert([jobOrderData])
                    .select();
                
                if (error) throw error;
                alert('Job order submitted successfully!');
                navigate('/admin');
            } else {
                await saveJobOrder({
                    ...jobOrderData,
                    // Keep original form field names for offline storage
                    ...formData,
                    signatureData: formData.signatureData,
                    mediaFiles: convertedMediaFiles, // Store converted media files
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
                alert('Job order saved offline. Use "Sync to Central DB" button in Admin panel to sync when database is ready.');
                navigate('/admin');
            }
        } catch (error) {
            console.warn('Could not submit to server (this is normal if database is not set up):', error.message);
            try {
                await saveJobOrder({
                    ...formData,
                    signatureData: formData.signatureData,
                    mediaFiles: convertedMediaFiles, // Store converted media files
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
                alert('Database connection failed. Job order saved offline. Use "Sync to Central DB" button in Admin panel to sync.');
                navigate('/admin');
            } catch (offlineError) {
                console.error('Offline save failed:', offlineError);
                alert('Failed to save job order. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="form-page">
            <PageHeader
                title="Job Order Form"
                subtitle="Fill out the form below to create a new job order"
                backPath="/admin"
                backLabel="← Back to Dashboard"
                rightContent={<OfflineStatus />}
            />
            
            <form onSubmit={handleSubmit} className="job-order-form">
                <FormSection title="General Information">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="caseNumber">Case Number *</label>
                            <input
                                type="text"
                                id="caseNumber"
                                value={formData.caseNumber}
                                onChange={(e) => handleInputChange('caseNumber', e.target.value)}
                                className={errors.caseNumber ? 'error' : ''}
                                placeholder="Enter case number"
                            />
                            {errors.caseNumber && <span className="error-text">{errors.caseNumber}</span>}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="orderDate">Order Date *</label>
                            <input
                                type="date"
                                id="orderDate"
                                value={formData.orderDate}
                                onChange={(e) => handleInputChange('orderDate', e.target.value)}
                            />
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Customer Details">
                    <div className="form-group">
                        <label htmlFor="customerName">Customer Name *</label>
                        <input
                            type="text"
                            id="customerName"
                            value={formData.customerName}
                            onChange={(e) => handleInputChange('customerName', e.target.value)}
                            className={errors.customerName ? 'error' : ''}
                            placeholder="Enter customer name"
                        />
                        {errors.customerName && <span className="error-text">{errors.customerName}</span>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="customerAddress">Customer Address *</label>
                        <textarea
                            id="customerAddress"
                            value={formData.customerAddress}
                            onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                            className={errors.customerAddress ? 'error' : ''}
                            placeholder="Enter customer address"
                            rows="3"
                        />
                        {errors.customerAddress && <span className="error-text">{errors.customerAddress}</span>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="customerEmail">Customer Email</label>
                        <input
                            type="email"
                            id="customerEmail"
                            value={formData.customerEmail}
                            onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                            className={errors.customerEmail ? 'error' : ''}
                            placeholder="Enter customer email (optional)"
                        />
                        {errors.customerEmail && <span className="error-text">{errors.customerEmail}</span>}
                    </div>
                </FormSection>

                <FormSection title="Appliance Details">
                    <div className="form-group">
                        <label htmlFor="sku">SKU *</label>
                        <input
                            type="text"
                            id="sku"
                            value={formData.sku}
                            onChange={(e) => handleInputChange('sku', e.target.value)}
                            className={errors.sku ? 'error' : ''}
                            placeholder="Enter appliance SKU"
                        />
                        {errors.sku && <span className="error-text">{errors.sku}</span>}
                    </div>
                    
                    <div className="form-group">
                        <label>Coverage Type *</label>
                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.coverage.includes('EXP')}
                                    onChange={(e) => {
                                        const newCoverage = e.target.checked
                                            ? [...formData.coverage, 'EXP']
                                            : formData.coverage.filter(c => c !== 'EXP');
                                        handleInputChange('coverage', newCoverage);
                                    }}
                                />
                                Extended Warranty (EXP)
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.coverage.includes('WTY')}
                                    onChange={(e) => {
                                        const newCoverage = e.target.checked
                                            ? [...formData.coverage, 'WTY']
                                            : formData.coverage.filter(c => c !== 'WTY');
                                        handleInputChange('coverage', newCoverage);
                                    }}
                                />
                                Warranty (WTY)
                            </label>
                        </div>
                        {errors.coverage && <span className="error-text">{errors.coverage}</span>}
                    </div>
                </FormSection>
         
       <FormSection title="Complaint Details">
                    <div className="form-group">
                        <label htmlFor="complaintDetails">Complaint Description</label>
                        <textarea
                            id="complaintDetails"
                            value={formData.complaintDetails}
                            onChange={(e) => handleInputChange('complaintDetails', e.target.value)}
                            placeholder="Describe the issue or complaint"
                            rows="4"
                        />
                    </div>
                </FormSection>

                <FormSection title="Dispatch Information">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="dispatchDate">Dispatch Date</label>
                            <input
                                type="date"
                                id="dispatchDate"
                                value={formData.dispatchDate}
                                onChange={(e) => handleInputChange('dispatchDate', e.target.value)}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="dispatchTime">Dispatch Time</label>
                            <input
                                type="time"
                                id="dispatchTime"
                                value={formData.dispatchTime}
                                onChange={(e) => handleInputChange('dispatchTime', e.target.value)}
                            />
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Service Findings">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.testedBefore}
                                    onChange={(e) => handleInputChange('testedBefore', e.target.checked)}
                                />
                                Tested Before Service
                            </label>
                        </div>
                        
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.testedAfter}
                                    onChange={(e) => handleInputChange('testedAfter', e.target.checked)}
                                />
                                Tested After Service
                            </label>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="troublesFound">Number of Troubles Found</label>
                        <input
                            type="number"
                            id="troublesFound"
                            min="0"
                            value={formData.troublesFound}
                            onChange={(e) => handleInputChange('troublesFound', parseInt(e.target.value) || 0)}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="otherNotes">Additional Notes</label>
                        <textarea
                            id="otherNotes"
                            value={formData.otherNotes}
                            onChange={(e) => handleInputChange('otherNotes', e.target.value)}
                            placeholder="Any additional notes or observations"
                            rows="3"
                        />
                    </div>
                </FormSection>

                <FormSection title="Photos & Documents">
                    <MediaUpload
                        files={formData.mediaFiles}
                        onChange={(files) => handleInputChange('mediaFiles', files)}
                    />
                </FormSection>

                <FormSection title="Customer Signature">
                    <SignaturePad
                        signature={formData.signatureData}
                        onChange={(signature) => handleInputChange('signatureData', signature)}
                    />
                </FormSection>

                <FormSection title="Terms & Conditions">
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.termsAccepted}
                                onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                                className={errors.termsAccepted ? 'error' : ''}
                            />
                            I accept the terms and conditions *
                        </label>
                        {errors.termsAccepted && <span className="error-text">{errors.termsAccepted}</span>}
                    </div>
                </FormSection>

                <div className="form-actions">
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        className="submit-btn"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Job Order'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default FormPage;