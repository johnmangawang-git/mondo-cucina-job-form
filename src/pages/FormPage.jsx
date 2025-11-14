import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormSection from '../components/form/FormSection';
import SignaturePad from '../components/form/SignaturePad';
import MediaUpload from '../components/form/MediaUpload';
import OfflineStatus from '../components/form/OfflineStatus';
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
        serialNumber: '',
        coverage: [],
        expiredWarranty: false,
        complaintDetails: '',
        timeIn: '',
        timeOut: '',
        technicianName1: '',
        technicianName2: '',
        testedBefore: false,
        testedAfter: false,
        findingsDiagnosis: '',
        otherNotes: '',
        partsNeeded: [{ partName: '', image: null }],
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
        if (formData.coverage.length === 0 && !formData.expiredWarranty) newErrors.coverage = 'At least one coverage type is required';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';
        
        if (formData.customerEmail && !/\S+@\S+\.\S+/.test(formData.customerEmail)) {
            newErrors.customerEmail = 'Please enter a valid email address';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePartNameChange = (index, value) => {
        const newPartsNeeded = [...formData.partsNeeded];
        newPartsNeeded[index].partName = value;
        setFormData(prev => ({ ...prev, partsNeeded: newPartsNeeded }));
    };

    const handlePartImageUpload = (index, imageFile) => {
        const newPartsNeeded = [...formData.partsNeeded];
        newPartsNeeded[index].image = imageFile;
        setFormData(prev => ({ ...prev, partsNeeded: newPartsNeeded }));
    };

    const addNewPartRow = () => {
        setFormData(prev => ({
            ...prev,
            partsNeeded: [...prev.partsNeeded, { partName: '', image: null }]
        }));
    };

    const removePartRow = (index) => {
        if (formData.partsNeeded.length <= 1) return;
        const newPartsNeeded = formData.partsNeeded.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, partsNeeded: newPartsNeeded }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        
        // Media files are already converted to base64 in MediaUpload component
        const convertedMediaFiles = formData.mediaFiles;
        
        try {
            // Map form data to database field names (match actual database schema)
            const jobOrderData = {
                case_number: formData.caseNumber,
                order_date: formData.orderDate,
                customer_name: formData.customerName,
                customer_address: formData.customerAddress,
                customer_email: formData.customerEmail || null,
                sku: formData.sku,
                coverage: Array.isArray(formData.coverage) ? formData.coverage.filter(c => ['EXP', 'WTY'].includes(c)) : [],
                complaint_details: formData.complaintDetails || null,
                dispatch_date: formData.orderDate || null, // Using order date as dispatch date
                dispatch_time: null, // Not collecting time in form
                tested_before: Boolean(formData.testedBefore),
                tested_after: Boolean(formData.testedAfter),
                troubles_found: 0, // Not collecting this in form
                other_notes: formData.otherNotes || null,
                media_urls: convertedMediaFiles.map(file => file.data), // Map mediaFiles to media_urls
                signature_url: formData.signatureData || null, // Map signatureData to signature_url
                terms_accepted: Boolean(formData.termsAccepted),
                status: isOnline ? 'synced' : 'pending'
            };
            
            console.log('Saving job order with signature:', formData.signatureData ? 'YES' : 'NO');
            console.log('Saving job order with media files:', convertedMediaFiles.length);
            
            // Check if Supabase is configured before attempting network calls
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            if (isOnline && supabaseUrl && supabaseKey && supabaseUrl !== 'your-supabase-url-here' && supabaseKey !== 'your-supabase-anon-key-here') {
                try {
                    // Add timeout to prevent hanging
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
                    
                    const { error } = await supabase
                        .from('job_orders')
                        .insert([jobOrderData])
                        .select()
                        .abortSignal(controller.signal);
                    
                    clearTimeout(timeoutId);
                    
                    if (error) throw error;
                    alert('Job order submitted successfully!');
                    navigate('/admin');
                    return;
                } catch (dbError) {
                    if (dbError.name === 'AbortError') {
                        console.warn('Database request timed out - saving offline instead');
                    } else {
                        console.warn('Database error - saving offline instead:', dbError.message);
                    }
                    // Fall through to offline save
                }
            }
            
            // Save offline (either because we're offline, no config, or database failed)
            await saveJobOrder({
                ...jobOrderData,
                // Keep original form field names for offline storage
                ...formData,
                signatureData: formData.signatureData,
                mediaFiles: convertedMediaFiles, // Store converted media files
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            
            if (!isOnline) {
                alert('Job order saved offline. Use "Sync to Central DB" button in Admin panel to sync when database is ready.');
            } else {
                alert('Database connection issue. Job order saved offline. Use "Sync to Central DB" button in Admin panel to sync.');
            }
            navigate('/admin');
            
        } catch (error) {
            console.error('Failed to save job order:', error);
            alert('Failed to save job order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="form-dashboard">
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <h1 className="display-6 fw-bold text-primary mb-2">Job Order Form</h1>
                    <p className="text-muted mb-0">Fill out the form below to create a new job order</p>
                </div>
                <OfflineStatus />
            </div>
            
            <form onSubmit={handleSubmit} className="job-order-form">
                <FormSection title="General Information">
                    <div className="row">
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label htmlFor="caseNumber" className="form-label required">Case Number</label>
                                <input
                                    type="text"
                                    id="caseNumber"
                                    className={`form-control ${errors.caseNumber ? 'is-invalid' : ''}`}
                                    value={formData.caseNumber}
                                    onChange={(e) => handleInputChange('caseNumber', e.target.value)}
                                    placeholder="Enter case number"
                                />
                                {errors.caseNumber && <div className="invalid-feedback">{errors.caseNumber}</div>}
                            </div>
                        </div>
                        
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label htmlFor="orderDate" className="form-label required">Order Date</label>
                                <input
                                    type="date"
                                    id="orderDate"
                                    className="form-control"
                                    value={formData.orderDate}
                                    onChange={(e) => handleInputChange('orderDate', e.target.value)}
                                />
                            </div>
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
                        <label htmlFor="serialNumber">Serial Number</label>
                        <input
                            type="text"
                            id="serialNumber"
                            value={formData.serialNumber}
                            onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                            placeholder="Enter appliance serial number"
                        />
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
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.expiredWarranty}
                                    onChange={(e) => handleInputChange('expiredWarranty', e.target.checked)}
                                />
                                Expired Warranty
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
                            <label htmlFor="timeIn">Time In</label>
                            <input
                                type="text"
                                id="timeIn"
                                value={formData.timeIn}
                                onChange={(e) => handleInputChange('timeIn', e.target.value)}
                                placeholder="Enter time in"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="timeOut">Time Out</label>
                            <input
                                type="text"
                                id="timeOut"
                                value={formData.timeOut}
                                onChange={(e) => handleInputChange('timeOut', e.target.value)}
                                placeholder="Enter time out"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="technicianName1">Technician Name (1)</label>
                            <input
                                type="text"
                                id="technicianName1"
                                value={formData.technicianName1}
                                onChange={(e) => handleInputChange('technicianName1', e.target.value)}
                                placeholder="Enter first technician name"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="technicianName2">Technician Name (2)</label>
                            <input
                                type="text"
                                id="technicianName2"
                                value={formData.technicianName2}
                                onChange={(e) => handleInputChange('technicianName2', e.target.value)}
                                placeholder="Enter second technician name"
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
                        <label htmlFor="findingsDiagnosis">Findings and Diagnosis</label>
                        <textarea
                            id="findingsDiagnosis"
                            value={formData.findingsDiagnosis}
                            onChange={(e) => handleInputChange('findingsDiagnosis', e.target.value)}
                            placeholder="Enter findings and diagnosis"
                            rows="3"
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

                <FormSection title="Parts Needed">
                    {formData.partsNeeded.map((part, index) => (
                        <div key={index} className="form-row mb-3 p-2 border rounded">
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label htmlFor={`partName-${index}`}>Part Name</label>
                                        <input
                                            type="text"
                                            id={`partName-${index}`}
                                            className="form-control"
                                            value={part.partName}
                                            onChange={(e) => handlePartNameChange(index, e.target.value)}
                                            placeholder="Enter part name"
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>Part Image</label>
                                        <div className="d-flex align-items-center">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="form-control"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        const file = e.target.files[0];
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            handlePartImageUpload(index, {
                                                                name: file.name,
                                                                data: event.target.result,
                                                                type: file.type,
                                                                size: file.size
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            {part.image && (
                                                <div className="ms-2">
                                                    <img 
                                                        src={part.image.data} 
                                                        alt="Part preview"
                                                        style={{
                                                            width: '50px',
                                                            height: '50px',
                                                            objectFit: 'cover',
                                                            borderRadius: '4px',
                                                            border: '1px solid #ddd'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {formData.partsNeeded.length > 1 && (
                                <div className="text-end">
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => removePartRow(index)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="text-center mt-3">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={addNewPartRow}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Add Parts
                        </button>
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

                <div className="d-flex justify-content-center mt-4 pt-4 border-top">
                    <button
                        type="submit"
                        className={`btn btn-primary btn-lg ${isSubmitting ? 'loading' : ''}`}
                        disabled={isSubmitting}
                        style={{ minWidth: '200px' }}
                    >
                        {isSubmitting ? (
                            <>
                                <i className="bi bi-arrow-repeat spin me-2"></i>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle me-2"></i>
                                Submit Job Order
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormPage;