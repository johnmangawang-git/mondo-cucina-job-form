import React from 'react';
import Button from './Button';
import { downloadIndividualJobOrder, downloadAsPDF } from '../../utils/exportUtils';

const JobOrderPreview = ({ jobOrder, onClose, isVisible }) => {
    if (!isVisible || !jobOrder) return null;

    const handlePrintThis = () => {
        downloadAsPDF([jobOrder], `job-order-${jobOrder.caseNumber || jobOrder.case_number}`);
    };

    const handleExportThis = () => {
        downloadIndividualJobOrder(jobOrder);
    };

    // Handle both pending (camelCase) and synced (snake_case) data formats
    const data = {
        caseNumber: jobOrder.caseNumber || jobOrder.case_number,
        customerName: jobOrder.customerName || jobOrder.customer_name,
        customerAddress: jobOrder.customerAddress || jobOrder.customer_address,
        customerEmail: jobOrder.customerEmail || jobOrder.customer_email,
        sku: jobOrder.sku,
        coverage: jobOrder.coverage,
        orderDate: jobOrder.orderDate || jobOrder.order_date,
        dispatchDate: jobOrder.dispatchDate || jobOrder.dispatch_date,
        dispatchTime: jobOrder.dispatchTime || jobOrder.dispatch_time,
        complaintDetails: jobOrder.complaintDetails || jobOrder.complaint_details,
        testedBefore: jobOrder.testedBefore || jobOrder.tested_before,
        testedAfter: jobOrder.testedAfter || jobOrder.tested_after,
        troublesFound: jobOrder.troublesFound || jobOrder.troubles_found,
        otherNotes: jobOrder.otherNotes || jobOrder.other_notes,
        signatureData: jobOrder.signatureData || jobOrder.signature_url,
        termsAccepted: jobOrder.termsAccepted || jobOrder.terms_accepted,
        status: jobOrder.status,
        createdAt: jobOrder.createdAt || jobOrder.created_at
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleDateString();
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'Not specified';
        return timeString;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content job-order-preview" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Job Order Preview</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <div className="preview-section">
                        <h3>📋 General Information</h3>
                        <div className="preview-row">
                            <div className="preview-field">
                                <label>Case Number:</label>
                                <span>{data.caseNumber || 'N/A'}</span>
                            </div>
                            <div className="preview-field">
                                <label>Order Date:</label>
                                <span>{formatDate(data.orderDate)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="preview-section">
                        <h3>👤 Customer Details</h3>
                        <div className="preview-field">
                            <label>Customer Name:</label>
                            <span>{data.customerName || 'N/A'}</span>
                        </div>
                        <div className="preview-field">
                            <label>Customer Address:</label>
                            <span>{data.customerAddress || 'N/A'}</span>
                        </div>
                        <div className="preview-field">
                            <label>Customer Email:</label>
                            <span>{data.customerEmail || 'Not provided'}</span>
                        </div>
                    </div>

                    <div className="preview-section">
                        <h3>🔧 Appliance Details</h3>
                        <div className="preview-row">
                            <div className="preview-field">
                                <label>SKU:</label>
                                <span>{data.sku || 'N/A'}</span>
                            </div>
                            <div className="preview-field">
                                <label>Coverage:</label>
                                <span>{Array.isArray(data.coverage) ? data.coverage.join(', ') : 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="preview-section">
                        <h3>📝 Complaint Details</h3>
                        <div className="preview-field">
                            <label>Description:</label>
                            <span>{data.complaintDetails || 'No complaint details provided'}</span>
                        </div>
                    </div>

                    <div className="preview-section">
                        <h3>🚚 Dispatch Information</h3>
                        <div className="preview-row">
                            <div className="preview-field">
                                <label>Dispatch Date:</label>
                                <span>{formatDate(data.dispatchDate)}</span>
                            </div>
                            <div className="preview-field">
                                <label>Dispatch Time:</label>
                                <span>{formatTime(data.dispatchTime)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="preview-section">
                        <h3>🔍 Service Findings</h3>
                        <div className="preview-row">
                            <div className="preview-field">
                                <label>Tested Before:</label>
                                <span className={data.testedBefore ? 'status-yes' : 'status-no'}>
                                    {data.testedBefore ? '✅ Yes' : '❌ No'}
                                </span>
                            </div>
                            <div className="preview-field">
                                <label>Tested After:</label>
                                <span className={data.testedAfter ? 'status-yes' : 'status-no'}>
                                    {data.testedAfter ? '✅ Yes' : '❌ No'}
                                </span>
                            </div>
                        </div>
                        <div className="preview-row">
                            <div className="preview-field">
                                <label>Troubles Found:</label>
                                <span>{data.troublesFound || 0}</span>
                            </div>
                            <div className="preview-field">
                                <label>Terms Accepted:</label>
                                <span className={data.termsAccepted ? 'status-yes' : 'status-no'}>
                                    {data.termsAccepted ? '✅ Yes' : '❌ No'}
                                </span>
                            </div>
                        </div>
                        {data.otherNotes && (
                            <div className="preview-field">
                                <label>Additional Notes:</label>
                                <span>{data.otherNotes}</span>
                            </div>
                        )}
                    </div>

                    {data.signatureData && (
                        <div className="preview-section">
                            <h3>✍️ Customer Signature</h3>
                            <div className="signature-preview-large">
                                <img 
                                    src={data.signatureData} 
                                    alt="Customer Signature" 
                                    className="signature-image-large"
                                />
                            </div>
                        </div>
                    )}

                    <div className="preview-section">
                        <h3>📊 Status Information</h3>
                        <div className="preview-row">
                            <div className="preview-field">
                                <label>Status:</label>
                                <span className={`status-badge ${data.status}`}>{data.status}</span>
                            </div>
                            <div className="preview-field">
                                <label>Created:</label>
                                <span>{formatDate(data.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <Button variant="outline" onClick={onClose}>
                        ❌ Close
                    </Button>
                    <Button variant="secondary" onClick={handlePrintThis}>
                        📋 Print/PDF
                    </Button>
                    <Button variant="primary" onClick={handleExportThis}>
                        📥 Export JSON
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default JobOrderPreview;