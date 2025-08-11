import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { useOfflineStorage } from '../hooks/useOfflineStorage';
import { supabase } from '../api/supabase';
import { downloadAsCSV, downloadAsPDF } from '../utils/exportUtils';

const AdminPage = () => {
    const navigate = useNavigate();
    const { getPendingJobOrders, clearSyncedJobOrders } = useOfflineStorage();
    const [jobOrders, setJobOrders] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadJobOrders();
    }, []);

    const loadJobOrders = async () => {
        setLoading(true);
        try {
            // Load from Supabase
            const { data: supabaseOrders, error } = await supabase
                .from('job_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setJobOrders(supabaseOrders || []);
            setConnectionError(false);

            // Load pending offline orders
            const pending = await getPendingJobOrders();
            setPendingOrders(pending || []);

        } catch (error) {
            console.warn('Could not load job orders from server (this is normal if database is not set up):', error.message);
            setConnectionError(true);
            // If online fetch fails, still show pending orders
            const pending = await getPendingJobOrders();
            setPendingOrders(pending || []);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            draft: 'bg-secondary',
            pending: 'bg-warning',
            synced: 'bg-success'
        };
        
        return (
            <span className={`status-badge ${statusClasses[status] || 'bg-secondary'}`}>
                {status}
            </span>
        );
    };

    const getAllItems = () => {
        return [...pendingOrders.map(item => ({...item, type: 'pending'})), 
                ...jobOrders.map(item => ({...item, type: 'synced'}))];
    };

    const handleSelectAll = () => {
        const allItems = getAllItems();
        if (selectAll) {
            setSelectedItems([]);
            setSelectAll(false);
        } else {
            setSelectedItems(allItems.map((item, index) => `${item.type}-${index}`));
            setSelectAll(true);
        }
    };

    const handleItemSelect = (itemId) => {
        setSelectedItems(prev => {
            const newSelection = prev.includes(itemId) 
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId];
            
            const allItems = getAllItems();
            setSelectAll(newSelection.length === allItems.length);
            return newSelection;
        });
    };

    const getSelectedData = () => {
        const allItems = getAllItems();
        return selectedItems.map(itemId => {
            const [type, index] = itemId.split('-');
            return allItems.find((item, idx) => item.type === type && idx.toString() === index);
        }).filter(Boolean);
    };

    const handleExport = (format) => {
        const selectedData = getSelectedData();
        if (selectedData.length === 0) {
            alert('Please select at least one job order to export.');
            return;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `mondo-cucina-selected-${timestamp}`;
        
        switch (format) {
            case 'excel':
                downloadAsCSV(selectedData, filename);
                break;
            case 'pdf':
                downloadAsPDF(selectedData, filename);
                break;
            default:
                break;
        }
    };

    const handleSyncToCentralDB = async () => {
        if (pendingOrders.length === 0) {
            alert('No pending orders to sync.');
            return;
        }

        setSyncing(true);
        let successCount = 0;
        let failCount = 0;
        let duplicateCount = 0;
        const duplicateCases = [];
        const syncedCases = [];

        try {
            for (const order of pendingOrders) {
                try {
                    // Check if case number already exists in database
                    const { data: existingOrder, error: checkError } = await supabase
                        .from('job_orders')
                        .select('case_number')
                        .eq('case_number', order.caseNumber)
                        .single();

                    if (checkError && checkError.code !== 'PGRST116') {
                        // PGRST116 is "not found" error, which is what we want
                        throw checkError;
                    }

                    if (existingOrder) {
                        // Case number already exists, mark as duplicate and add to removal list
                        duplicateCount++;
                        duplicateCases.push(order.caseNumber);
                        syncedCases.push(order.caseNumber); // Remove from local storage even if duplicate
                        console.log(`Skipping duplicate case number: ${order.caseNumber}`);
                        continue;
                    }

                    // Map the offline data to database format
                    const dbData = {
                        case_number: order.caseNumber,
                        order_date: order.orderDate,
                        customer_name: order.customerName,
                        customer_address: order.customerAddress,
                        customer_email: order.customerEmail,
                        sku: order.sku,
                        coverage: order.coverage,
                        complaint_details: order.complaintDetails,
                        dispatch_date: order.dispatchDate || null,
                        dispatch_time: order.dispatchTime || null,
                        tested_before: order.testedBefore,
                        tested_after: order.testedAfter,
                        troubles_found: order.troublesFound,
                        other_notes: order.otherNotes,
                        media_urls: order.mediaFiles ? order.mediaFiles.map(file => file.data) : [],
                        signature_url: order.signatureData,
                        terms_accepted: order.termsAccepted,
                        status: 'synced',
                        created_at: order.createdAt
                    };

                    const { error } = await supabase
                        .from('job_orders')
                        .insert([dbData]);

                    if (error) throw error;
                    successCount++;
                    syncedCases.push(order.caseNumber);
                } catch (error) {
                    console.error('Failed to sync order:', order.caseNumber, error);
                    failCount++;
                }
            }

            // Remove successfully synced orders (including duplicates) from local storage
            if (syncedCases.length > 0) {
                await clearSyncedJobOrders(syncedCases);
                console.log(`Removed ${syncedCases.length} synced orders from local storage:`, syncedCases);
            }

            // Show detailed results
            let message = '';
            if (successCount > 0) {
                message += `✅ Successfully synced ${successCount} new job order(s) to central database!`;
            }
            if (duplicateCount > 0) {
                message += `\n⚠️ Removed ${duplicateCount} duplicate case(s) from pending: ${duplicateCases.join(', ')}`;
            }
            if (failCount > 0) {
                message += `\n❌ ${failCount} failed to sync due to errors.`;
            }
            
            if (successCount === 0 && duplicateCount === 0 && failCount > 0) {
                message = '❌ Failed to sync any job orders. Please check your database connection.';
            } else if (successCount === 0 && duplicateCount > 0) {
                message = `ℹ️ All ${duplicateCount} job orders were already synced. Removed duplicates from pending list.`;
            }

            alert(message);
            
            // Refresh the data to update the UI
            loadJobOrders();
        } catch (error) {
            console.error('Sync error:', error);
            alert('❌ Sync failed. Please check your database connection and try again.');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading job orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <PageHeader
                title="Job Orders Dashboard"
                subtitle="Manage and view all job orders"
                backPath="/form"
                backLabel="← Back to Form"
                rightContent={
                    <div className="admin-actions">
                        <Button
                            variant="primary"
                            onClick={() => navigate('/form')}
                        >
                            New Job Order
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={loadJobOrders}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/debug')}
                        >
                            Debug Data
                        </Button>
                        {pendingOrders.length > 0 && (
                            <Button
                                variant="success"
                                onClick={handleSyncToCentralDB}
                                disabled={syncing}
                            >
                                {syncing ? 'Syncing...' : `🔄 Sync to Central DB (${pendingOrders.length})`}
                            </Button>
                        )}
                    </div>
                }
            />

            {connectionError && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    color: '#856404'
                }}>
                    <strong>ℹ️ Database Connection:</strong> Working in offline mode. 
                    Job orders are saved locally and will sync when database is configured.
                </div>
            )}

            {(pendingOrders.length > 0 || jobOrders.length > 0) && (
                <div className="export-section">
                    <h3>📥 Download Data</h3>
                    
                    <div className="selection-controls">
                        <div className="select-all-section">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                />
                                <strong>Select All ({getAllItems().length} items)</strong>
                            </label>
                            <span className="selection-count">
                                {selectedItems.length} selected
                            </span>
                        </div>
                    </div>

                    <div className="export-buttons">
                        <Button
                            variant="primary"
                            size="medium"
                            onClick={() => handleExport('excel')}
                            disabled={selectedItems.length === 0}
                        >
                            📊 Download Excel Data ({selectedItems.length})
                        </Button>
                        <Button
                            variant="secondary"
                            size="medium"
                            onClick={() => handleExport('pdf')}
                            disabled={selectedItems.length === 0}
                        >
                            📋 Print/PDF ({selectedItems.length})
                        </Button>
                    </div>
                    
                    <div style={{ marginTop: '10px' }}>
                        <small style={{ color: '#7f8c8d' }}>
                            💡 Select job orders above, then choose download option
                        </small>
                    </div>
                </div>
            )}

            {pendingOrders.length > 0 && (
                <div className="pending-section">
                    <h2>Pending Sync ({pendingOrders.length})</h2>
                    <div className="job-orders-grid">
                        {pendingOrders.map((order, index) => {
                            const itemId = `pending-${index}`;
                            const isSelected = selectedItems.includes(itemId);
                            
                            return (
                                <div key={itemId} className={`job-order-card pending ${isSelected ? 'selected' : ''}`}>
                                    <div className="card-header">
                                        <div className="card-header-left">
                                            <label className="card-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleItemSelect(itemId)}
                                                />
                                            </label>
                                            <h3>Case: {order.caseNumber}</h3>
                                        </div>
                                        {getStatusBadge('pending')}
                                    </div>
                                <div className="card-body">
                                    <p><strong>Customer:</strong> {order.customerName}</p>
                                    <p><strong>SKU:</strong> {order.sku}</p>
                                    <p><strong>Date:</strong> {formatDate(order.createdAt)}</p>
                                    {order.signatureData && (
                                        <div className="signature-preview">
                                            <p><strong>Signature:</strong></p>
                                            <img 
                                                src={order.signatureData} 
                                                alt="Customer Signature" 
                                                className="signature-image"
                                                style={{
                                                    maxWidth: '200px',
                                                    maxHeight: '100px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        </div>
                                    )}
                                    {!order.signatureData && (
                                        <p><strong>Signature:</strong> <span className="text-muted">Not provided</span></p>
                                    )}
                                    {order.mediaFiles && order.mediaFiles.length > 0 && (
                                        <div className="media-preview">
                                            <p><strong>Uploaded Files ({order.mediaFiles.length}):</strong></p>
                                            <div className="media-grid">
                                                {order.mediaFiles.map((file, fileIndex) => (
                                                    <div key={fileIndex} className="media-item">
                                                        {(file.type && file.type.startsWith('image/') && file.data) ? (
                                                            <img 
                                                                src={file.data} 
                                                                alt={`Uploaded file ${fileIndex + 1}`}
                                                                className="media-image"
                                                                style={{
                                                                    maxWidth: '100px',
                                                                    maxHeight: '100px',
                                                                    objectFit: 'cover',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #ddd',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => window.open(file.data, '_blank')}
                                                            />
                                                        ) : (
                                                            <div className="media-file" style={{
                                                                padding: '10px',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '4px',
                                                                textAlign: 'center',
                                                                backgroundColor: '#f9f9f9'
                                                            }}>
                                                                <div className="file-icon">📄</div>
                                                                <div className="file-name" style={{ fontSize: '12px', marginTop: '5px' }}>
                                                                    {file.name}
                                                                </div>
                                                                {file.size && (
                                                                    <div className="file-size" style={{ fontSize: '11px', color: '#666' }}>
                                                                        {(file.size / 1024).toFixed(1)} KB
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(!order.mediaFiles || order.mediaFiles.length === 0) && (
                                        <p><strong>Media Files:</strong> <span className="text-muted">None uploaded</span></p>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                </div>
            )}

            <div className="synced-section">
                <h2>Synced Orders ({jobOrders.length})</h2>
                {jobOrders.length === 0 ? (
                    <div className="empty-state">
                        <p>No job orders found.</p>
                        <Button
                            variant="primary"
                            onClick={() => navigate('/form')}
                        >
                            Create First Job Order
                        </Button>
                    </div>
                ) : (
                    <div className="job-orders-grid">
                        {jobOrders.map((order, index) => {
                            const itemId = `synced-${index}`;
                            const isSelected = selectedItems.includes(itemId);
                            
                            return (
                                <div key={order.id} className={`job-order-card ${isSelected ? 'selected' : ''}`}>
                                    <div className="card-header">
                                        <div className="card-header-left">
                                            <label className="card-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleItemSelect(itemId)}
                                                />
                                            </label>
                                            <h3>Case: {order.case_number}</h3>
                                        </div>
                                        {getStatusBadge(order.status)}
                                    </div>
                                <div className="card-body">
                                    <p><strong>Customer:</strong> {order.customer_name}</p>
                                    <p><strong>SKU:</strong> {order.sku}</p>
                                    <p><strong>Date:</strong> {formatDate(order.created_at)}</p>
                                    {order.coverage && (
                                        <p><strong>Coverage:</strong> {order.coverage.join(', ')}</p>
                                    )}
                                    {order.signature_url && (
                                        <div className="signature-preview">
                                            <p><strong>Signature:</strong></p>
                                            <img 
                                                src={order.signature_url} 
                                                alt="Customer Signature" 
                                                className="signature-image"
                                                style={{
                                                    maxWidth: '200px',
                                                    maxHeight: '100px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        </div>
                                    )}
                                    {!order.signature_url && (
                                        <p><strong>Signature:</strong> <span className="text-muted">Not provided</span></p>
                                    )}
                                    {order.media_urls && order.media_urls.length > 0 && (
                                        <div className="media-preview">
                                            <p><strong>Media Files ({order.media_urls.length}):</strong></p>
                                            <div className="media-grid">
                                                {order.media_urls.map((url, fileIndex) => (
                                                    <div key={fileIndex} className="media-item">
                                                        <img 
                                                            src={url} 
                                                            alt={`Media file ${fileIndex + 1}`}
                                                            className="media-image"
                                                            onClick={() => window.open(url, '_blank')}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(!order.media_urls || order.media_urls.length === 0) && (
                                        <p><strong>Media Files:</strong> <span className="text-muted">None uploaded</span></p>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;