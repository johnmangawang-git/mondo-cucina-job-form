import React, { useState, useEffect } from 'react';
import FormSection from './FormSection';
import SignaturePad from './SignaturePad';
import MediaUpload from './MediaUpload';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';
import { supabase } from '../../api/supabase';

const EditJobOrderModal = ({ jobOrder, onClose, onSave, isOnline }) => {
    const { saveJobOrder } = useOfflineStorage();
    const [formData, setFormData] = useState({
        caseNumber: jobOrder.case_number || jobOrder.caseNumber || '',
        orderDate: jobOrder.order_date || jobOrder.orderDate || '',
        customerName: jobOrder.customer_name || jobOrder.customerName || '',
        customerAddress: jobOrder.customer_address || jobOrder.customerAddress || '',
        customerEmail: jobOrder.customer_email || jobOrder.customerEmail || '',
        sku: jobOrder.sku || '',
        serialNumber: jobOrder.serial_number || jobOrder.serialNumber || '',
        coverage: jobOrder.coverage || [],
        expiredWarranty: jobOrder.expired_warranty || jobOrder.expiredWarranty || false,
        complaintDetails: jobOrder.complaint_details || jobOrder.complaintDetails || '',
        timeIn: jobOrder.time_in || jobOrder.timeIn || '',
        timeOut: jobOrder.time_out || jobOrder.timeOut || '',
        technicianName1: jobOrder.technician_name_1 || jobOrder.technicianName1 || '',
        technicianName2: jobOrder.technician_name_2 || jobOrder.technicianName2 || '',
        testedBefore: jobOrder.tested_before || jobOrder.testedBefore || false,
        testedAfter: jobOrder.tested_after || jobOrder.testedAfter || false,
        findingsDiagnosis: jobOrder.findings_diagnosis || jobOrder.findingsDiagnosis || '',
        otherNotes: jobOrder.other_notes || jobOrder.otherNotes || '',
        partsNeeded: jobOrder.parts_needed || jobOrder.partsNeeded || [{ partName: '', image: null }],
        mediaFiles: jobOrder.media_urls ? jobOrder.media_urls.map(url => ({ data: url })) : jobOrder.mediaFiles || [],
        signatureData: jobOrder.signature_url || jobOrder.signatureData || null,
        termsAccepted: jobOrder.terms_accepted || jobOrder.termsAccepted || false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
        setIsSubmitting(true);

        try {
            // Map form data to database field names
            const jobOrderData = {
                case_number: formData.caseNumber,
                order_date: formData.orderDate,
                customer_name: formData.customerName,
                customer_address: formData.customerAddress,
                customer_email: formData.customerEmail,
                sku: formData.sku,
                serial_number: formData.serialNumber,
                coverage: formData.coverage,
                expired_warranty: formData.expiredWarranty,
                complaint_details: formData.complaintDetails,
                time_in: formData.timeIn,
                time_out: formData.timeOut,
                technician_name_1: formData.technicianName1,
                technician_name_2: formData.technicianName2,
                tested_before: formData.testedBefore,
                tested_after: formData.testedAfter,
                findings_diagnosis: formData.findingsDiagnosis,
                other_notes: formData.otherNotes,
                parts_needed: formData.partsNeeded,
                media_urls: formData.mediaFiles.map(file => file.data),
                signature_url: formData.signatureData,
                terms_accepted: formData.termsAccepted,
                status: isOnline ? 'synced' : 'pending',
                created_at: jobOrder.created_at || jobOrder.createdAt || new Date().toISOString()
            };

            // For synced orders, update in Supabase
            if (jobOrder.id && isOnline) {
                const { error } = await supabase
                    .from('job_orders')
                    .update(jobOrderData)
                    .eq('id', jobOrder.id);

                if (error) throw error;
            } else {
                // For pending orders or offline mode, save locally
                await saveJobOrder({
                    ...jobOrderData,
                    id: jobOrder.id || undefined,
                    status: 'pending',
                    createdAt: jobOrder.createdAt || jobOrder.created_at || new Date().toISOString()
                });
            }

            onSave(jobOrderData);
            onClose();
        } catch (error) {
            console.error('Failed to update job order:', error);
            alert('Failed to update job order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay edit-job-order-modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Job Order - {formData.caseNumber}</h2>
                    <button 
                        onClick={onClose}
                        className="modal-close-btn"
                    >
                        ×
                    </button>
                </div>
                
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="job-order-form">
                        <FormSection title="General Information">
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label htmlFor="caseNumber" className="form-label required">Case Number</label>
                                        <input
                                            type="text"
                                            id="caseNumber"
                                            className="form-control"
                                            value={formData.caseNumber}
                                            onChange={(e) => handleInputChange('caseNumber', e.target.value)}
                                            placeholder="Enter case number"
                                        />
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
                                    placeholder="Enter customer name"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="customerAddress">Customer Address *</label>
                                <textarea
                                    id="customerAddress"
                                    value={formData.customerAddress}
                                    onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                                    placeholder="Enter customer address"
                                    rows="3"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="customerEmail">Customer Email</label>
                                <input
                                    type="email"
                                    id="customerEmail"
                                    value={formData.customerEmail}
                                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                                    placeholder="Enter customer email (optional)"
                                />
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
                                    placeholder="Enter appliance SKU"
                                />
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
                                    />
                                    I accept the terms and conditions *
                                </label>
                            </div>
                        </FormSection>

                        <div className="d-flex justify-content-between mt-4 pt-4 border-top">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
                                disabled={isSubmitting}
                                style={{ minWidth: '150px' }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <i className="bi bi-arrow-repeat spin me-2"></i>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-circle me-2"></i>
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditJobOrderModal;