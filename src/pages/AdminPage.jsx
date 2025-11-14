import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useOfflineStorage } from '../hooks/useOfflineStorage';
import { supabase } from '../api/supabase';
import { downloadAsCSV, downloadAsPDF } from '../utils/exportUtils';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import EditJobOrderModal from '../components/form/EditJobOrderModal';

const AdminPage = () => {
    const navigate = useNavigate();
    const { getPendingJobOrders, clearSyncedJobOrders } = useOfflineStorage();
    const { isDesktop, isMobile } = useDeviceDetection();
    const [editingJobOrder, setEditingJobOrder] = useState(null);
    const [jobOrders, setJobOrders] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(false); // Start with false for immediate UI
    const [dataLoading, setDataLoading] = useState(true); // Separate loading for data
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Initializing...');

    // Memoize environment check to avoid repeated validations
    const isSupabaseConfigured = useMemo(() => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        return supabaseUrl && supabaseKey && 
               supabaseUrl !== 'your-supabase-url-here' && 
               supabaseKey !== 'your-supabase-anon-key-here';
    }, []);

    useEffect(() => {
        // Start loading data immediately but don't block UI
        loadJobOrdersOptimized();
    }, []);

    const loadJobOrdersOptimized = useCallback(async () => {
        setDataLoading(true);
        setLoadingMessage('Loading offline data...');
        
        try {
            // Step 1: Load offline data first (fastest)
            const pending = await getPendingJobOrders();
            setPendingOrders(Array.isArray(pending) ? pending : []);
            setLoadingMessage('Offline data loaded');

            // Step 2: Check online data if configured
            if (!isSupabaseConfigured) {
                console.info('Supabase not configured - working in offline mode only');
                setConnectionError(true);
                setJobOrders([]);
                setDataLoading(false);
                return;
            }

            setLoadingMessage('Connecting to database...');
            
            // Step 3: Try to load from Supabase with shorter timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                setLoadingMessage('Connection timeout - using offline mode');
            }, 3000); // Reduced from 5s to 3s
            
            try {
                const { data: supabaseOrders, error } = await supabase
                    .from('job_orders')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50) // Limit initial load to 50 most recent
                    .abortSignal(controller.signal);
                
                clearTimeout(timeoutId);

                if (error) throw error;
                setJobOrders(Array.isArray(supabaseOrders) ? supabaseOrders : []);
                setConnectionError(false);
                setLoadingMessage('Database connected');

            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    console.warn('Supabase request timed out - switching to offline mode');
                    setLoadingMessage('Connection timeout - offline mode active');
                } else {
                    console.warn('Could not load job orders from server:', error.message);
                    setLoadingMessage('Database unavailable - offline mode active');
                }
                setConnectionError(true);
                setJobOrders([]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setLoadingMessage('Error loading data');
            setPendingOrders([]);
            setJobOrders([]);
        } finally {
            setDataLoading(false);
        }
    }, [getPendingJobOrders, isSupabaseConfigured]);

    const loadJobOrders = useCallback(() => {
        setLoading(true);
        loadJobOrdersOptimized().finally(() => setLoading(false));
    }, [loadJobOrdersOptimized]);

    // Optimized memoized calculations
    const getAllItems = useCallback(() => {
        // Ensure both pendingOrders and jobOrders are arrays
        const safePendingOrders = Array.isArray(pendingOrders) ? pendingOrders : [];
        const safeJobOrders = Array.isArray(jobOrders) ? jobOrders : [];
        
        return [
            ...safePendingOrders.map(item => ({...item, type: 'pending'})), 
            ...safeJobOrders.map(item => ({...item, type: 'synced'}))
        ];
    }, [pendingOrders, jobOrders]);

    const allItems = useMemo(() => getAllItems(), [getAllItems]);

    const handleSelectAll = useCallback(() => {
        if (selectAll) {
            setSelectedItems([]);
            setSelectAll(false);
        } else {
            setSelectedItems(allItems.map((item, index) => `${item.type}-${index}`));
            setSelectAll(true);
        }
    }, [selectAll, allItems]);

    const handleItemSelect = useCallback((itemId) => {
        setSelectedItems(prev => {
            const newSelection = prev.includes(itemId) 
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId];
            
            setSelectAll(newSelection.length === allItems.length);
            return newSelection;
        });
    }, [allItems.length]);

    const getSelectedData = useCallback(() => {
        return selectedItems.map(itemId => {
            const [type, index] = itemId.split('-');
            return allItems.find((item, idx) => item.type === type && idx.toString() === index);
        }).filter(Boolean);
    }, [selectedItems, allItems]);

    const formatDate = useCallback((dateString) => {
        return new Date(dateString).toLocaleDateString();
    }, []);

    const getStatusBadge = useCallback((status) => {
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
    }, []);

    const handleExport = useCallback((format) => {
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
    }, [getSelectedData]);

    const handleSyncToCentralDB = useCallback(async () => {
        if (pendingOrders.length === 0) {
            alert('No pending orders to sync.');
            return;
        }

        // Check if Supabase is configured
        if (!isSupabaseConfigured) {
            alert('⚠️ Supabase database is not configured. Please set up environment variables to enable sync functionality.');
            return;
        }

        // Test Supabase connection before syncing
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const { data, error } = await supabase
                .from('job_orders')
                .select('id')
                .limit(1)
                .abortSignal(controller.signal);
            
            clearTimeout(timeoutId);
            
            if (error) {
                if (error.message && (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED'))) {
                    console.error('Network error during connection test:', error);
                    alert('❌ Cannot connect to the database. Please check your internet connection and database configuration.\n\nOrders remain in local storage.');
                    return;
                }
                // Other errors might be acceptable, continue with sync
            }
        } catch (connectionError) {
            console.error('Supabase connection test failed:', connectionError);
            alert('❌ Cannot connect to the database. Please check your internet connection and database configuration.\n\nOrders remain in local storage.');
            return;
        }

        setSyncing(true);
        let successCount = 0;
        let failCount = 0;
        let duplicateCount = 0;
        const duplicateCases = [];
        const syncedCases = [];

        try {
            // Process in smaller batches to improve performance
            const batchSize = 5;
            for (let i = 0; i < pendingOrders.length; i += batchSize) {
                const batch = pendingOrders.slice(i, i + batchSize);
                
                await Promise.allSettled(batch.map(async (order) => {
                    try {
                        // Check if case number already exists in database
                        const { data: existingOrder, error: checkError } = await supabase
                            .from('job_orders')
                            .select('case_number')
                            .eq('case_number', order.caseNumber)
                            .single();

                        // Handle connection errors specifically
                        if (checkError) {
                            if (checkError.message && (checkError.message.includes('fetch') || checkError.message.includes('Failed to fetch') || checkError.message.includes('ERR_NAME_NOT_RESOLVED'))) {
                                // Network error - treat as connection failure, not duplicate
                                console.error('Network error during duplicate check for order:', order.caseNumber, checkError);
                                throw new Error('Network connection failed during sync');
                            }
                            
                            // PGRST116 is "not found" error, which is what we want for new records
                            if (checkError.code !== 'PGRST116') {
                                console.error('Database check error for order:', order.caseNumber, checkError);
                                throw checkError;
                            }
                        }

                        if (existingOrder) {
                            // Case number already exists, mark as duplicate and add to removal list
                            duplicateCount++;
                            duplicateCases.push(order.caseNumber);
                            syncedCases.push(order.caseNumber); // Remove from local storage even if duplicate
                            console.log(`Skipping duplicate case number: ${order.caseNumber}`);
                            return;
                        }

                        // Map the offline data to database format
                        const dbData = {
                            case_number: order.caseNumber,
                            order_date: order.orderDate,
                            customer_name: order.customerName,
                            customer_address: order.customerAddress,
                            customer_email: order.customerEmail,
                            sku: order.sku,
                            serial_number: order.serialNumber || '',
                            coverage: order.coverage || [],
                            expired_warranty: order.expiredWarranty || false,
                            complaint_details: order.complaintDetails,
                            time_in: order.timeIn || null,
                            time_out: order.timeOut || null,
                            technician_name_1: order.technicianName1 || '',
                            technician_name_2: order.technicianName2 || '',
                            tested_before: order.testedBefore,
                            tested_after: order.testedAfter,
                            findings_diagnosis: order.findingsDiagnosis || '',
                            other_notes: order.otherNotes,
                            parts_needed: order.partsNeeded || [],
                            media_urls: order.mediaFiles ? order.mediaFiles.map(file => file.data) : [],
                            signature_url: order.signatureData,
                            terms_accepted: order.termsAccepted,
                            status: 'synced',
                            created_at: order.createdAt
                        };

                        const { error } = await supabase
                            .from('job_orders')
                            .insert([dbData]);

                        if (error) {
                            // Handle connection errors specifically
                            if (error.message && (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED'))) {
                                console.error('Network error during insert for order:', order.caseNumber, error);
                                throw new Error('Network connection failed during sync');
                            }
                            
                            console.error('Insert error for order:', order.caseNumber, error);
                            throw error;
                        }
                        successCount++;
                        syncedCases.push(order.caseNumber);
                    } catch (error) {
                        console.error('Failed to sync order:', order.caseNumber, error);
                        failCount++;
                        // Don't add to syncedCases if failed - keep in local storage
                    }
                }));
            }

            // ONLY remove successfully synced orders (including duplicates) from local storage
            // Failed orders should remain in local storage for retry
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
                message += `\n❌ ${failCount} failed to sync due to errors. These orders remain in local storage for retry.`;
            }
            
            if (successCount === 0 && duplicateCount === 0 && failCount > 0) {
                message = '❌ Failed to sync any job orders. Please check your database connection. Orders remain in local storage.';
            } else if (successCount === 0 && duplicateCount > 0) {
                message = `ℹ️ All ${duplicateCount} job orders were already synced. Removed duplicates from pending list.`;
            }

            alert(message);
            
            // Refresh the data to update the UI
            loadJobOrders();
        } catch (error) {
            console.error('Sync error:', error);
            alert('❌ Sync failed. Please check your database connection and try again. Orders remain in local storage.');
        } finally {
            setSyncing(false);
        }
    }, [pendingOrders, isSupabaseConfigured, clearSyncedJobOrders, loadJobOrders]);

    const handleEditJobOrder = (jobOrder) => {
        if (isDesktop) {
            // Ensure all fields are properly passed to the edit modal
            setEditingJobOrder({
                ...jobOrder,
                // Ensure parts_needed is properly structured
                parts_needed: jobOrder.parts_needed || jobOrder.partsNeeded || [],
                // Ensure media_urls is properly structured
                media_urls: jobOrder.media_urls || jobOrder.mediaFiles || [],
                // Ensure all boolean fields are properly set
                expired_warranty: jobOrder.expired_warranty !== undefined ? 
                    jobOrder.expired_warranty : 
                    (jobOrder.expiredWarranty || false),
                tested_before: jobOrder.tested_before !== undefined ? 
                    jobOrder.tested_before : 
                    (jobOrder.testedBefore || false),
                tested_after: jobOrder.tested_after !== undefined ? 
                    jobOrder.tested_after : 
                    (jobOrder.testedAfter || false),
                terms_accepted: jobOrder.terms_accepted !== undefined ? 
                    jobOrder.terms_accepted : 
                    (jobOrder.termsAccepted || false)
            });
        }
    };

    const handleSaveEditedJobOrder = (updatedJobOrder) => {
        // Refresh the data to show updated job order
        loadJobOrders();
        alert('Job order updated successfully!');
    };

    const handleCloseEditModal = () => {
        setEditingJobOrder(null);
    };

    // Loading states with better UX
    if (loading && dataLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted">Loading Dashboard...</h5>
                    <p className="text-muted mb-0">{loadingMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <h1 className="display-6 fw-bold text-primary mb-2">Dashboard</h1>
                    <p className="text-muted mb-0">Manage and view all job orders</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/form')}
                    >
                        <i className="bi bi-plus-circle me-2"></i>
                        New Job Order
                    </button>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={loadJobOrders}
                    >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Refresh
                    </button>
                    <button
                        className="btn btn-outline-info"
                        onClick={() => navigate('/debug')}
                    >
                        <i className="bi bi-bug me-2"></i>
                        Debug
                    </button>
                    {pendingOrders.length > 0 && (
                        <button
                            className="btn btn-success"
                            onClick={handleSyncToCentralDB}
                            disabled={syncing}
                        >
                            <i className={`bi ${syncing ? 'bi-arrow-repeat spin' : 'bi-cloud-upload'} me-2`}></i>
                            {syncing ? 'Syncing...' : `Sync (${pendingOrders.length})`}
                        </button>
                    )}
                </div>
            </div>

            {connectionError && (
                <div className="alert alert-warning d-flex align-items-center mb-4" role="alert">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    <div>
                        <strong>Database Connection:</strong> Working in offline mode. 
                        Job orders are saved locally and will sync when database is configured.
                    </div>
                </div>
            )}

            {(pendingOrders.length > 0 || jobOrders.length > 0) && (
                <div className="card mb-4">
                    <div className="card-header bg-primary text-white">
                        <h5 className="card-title mb-0">
                            <i className="bi bi-download me-2"></i>
                            Export Data
                        </h5>
                    </div>
                    <div className="card-body">
                        <div className="row align-items-center mb-3">
                            <div className="col-md-6">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="selectAllCheck"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                    />
                                    <label className="form-check-label fw-bold" htmlFor="selectAllCheck">
                                        Select All ({getAllItems().length} items)
                                    </label>
                                </div>
                            </div>
                            <div className="col-md-6 text-md-end">
                                <span className="badge bg-info fs-6">
                                    {selectedItems.length} selected
                                </span>
                            </div>
                        </div>
                        
                        <div className="d-flex gap-2 flex-wrap">
                            <button
                                className="btn btn-success"
                                onClick={() => handleExport('excel')}
                                disabled={selectedItems.length === 0}
                            >
                                <i className="bi bi-file-earmark-excel me-2"></i>
                                Excel ({selectedItems.length})
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleExport('pdf')}
                                disabled={selectedItems.length === 0}
                            >
                                <i className="bi bi-file-earmark-pdf me-2"></i>
                                PDF ({selectedItems.length})
                            </button>
                        </div>
                        
                        <div className="mt-2">
                            <small className="text-muted">
                                <i className="bi bi-lightbulb me-1"></i>
                                Select job orders above, then choose download option
                            </small>
                        </div>
                    </div>
                </div>
            )}

            {pendingOrders.length > 0 && (
                <div className="mb-4">
                    <div className="d-flex align-items-center mb-3">
                        <h4 className="text-warning mb-0">
                            <i className="bi bi-clock-history me-2"></i>
                            Pending Sync
                        </h4>
                        <span className="badge bg-warning text-dark ms-2">{pendingOrders.length}</span>
                    </div>
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
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
                                        <div className="card-header-right">
                                            {getStatusBadge('pending')}
                                            {isDesktop && (
                                                <button
                                                    className="btn btn-sm btn-outline-primary ms-2"
                                                    onClick={() => handleEditJobOrder(order)}
                                                >
                                                    <i className="bi bi-pencil"></i> Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                <div className="card-body">
                                    <p><strong>Customer:</strong> {order.customerName}</p>
                                    <p><strong>SKU:</strong> {order.sku}</p>
                                    <p><strong>Date:</strong> {formatDate(order.createdAt)}</p>
                                    {order.serialNumber && (
                                        <p><strong>Serial Number:</strong> {order.serialNumber}</p>
                                    )}
                                    {order.coverage && order.coverage.length > 0 && (
                                        <p><strong>Coverage:</strong> {order.coverage.join(', ')}</p>
                                    )}
                                    {order.expiredWarranty && (
                                        <p><strong>Expired Warranty:</strong> Yes</p>
                                    )}
                                    {order.timeIn && (
                                        <p><strong>Time In:</strong> {order.timeIn}</p>
                                    )}
                                    {order.timeOut && (
                                        <p><strong>Time Out:</strong> {order.timeOut}</p>
                                    )}
                                    {order.technicianName1 && (
                                        <p><strong>Technician 1:</strong> {order.technicianName1}</p>
                                    )}
                                    {order.technicianName2 && (
                                        <p><strong>Technician 2:</strong> {order.technicianName2}</p>
                                    )}
                                    {order.findingsDiagnosis && (
                                        <p><strong>Findings/Diagnosis:</strong> {order.findingsDiagnosis}</p>
                                    )}
                                    {order.partsNeeded && order.partsNeeded.length > 0 && (
                                        <div>
                                            <p><strong>Parts Needed:</strong></p>
                                            <ul>
                                                {order.partsNeeded.map((part, index) => (
                                                    <li key={index}>
                                                        {part.partName || part}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
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
                                        <div className="card-header-right">
                                            {getStatusBadge(order.status)}
                                            {isDesktop && (
                                                <button
                                                    className="btn btn-sm btn-outline-primary ms-2"
                                                    onClick={() => handleEditJobOrder(order)}
                                                >
                                                    <i className="bi bi-pencil"></i> Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                <div className="card-body">
                                    <p><strong>Customer:</strong> {order.customer_name}</p>
                                    <p><strong>SKU:</strong> {order.sku}</p>
                                    <p><strong>Date:</strong> {formatDate(order.created_at)}</p>
                                    {order.serial_number && (
                                        <p><strong>Serial Number:</strong> {order.serial_number}</p>
                                    )}
                                    {order.coverage && order.coverage.length > 0 && (
                                        <p><strong>Coverage:</strong> {order.coverage.join(', ')}</p>
                                    )}
                                    {order.expired_warranty && (
                                        <p><strong>Expired Warranty:</strong> Yes</p>
                                    )}
                                    {order.time_in && (
                                        <p><strong>Time In:</strong> {order.time_in}</p>
                                    )}
                                    {order.time_out && (
                                        <p><strong>Time Out:</strong> {order.time_out}</p>
                                    )}
                                    {order.technician_name_1 && (
                                        <p><strong>Technician 1:</strong> {order.technician_name_1}</p>
                                    )}
                                    {order.technician_name_2 && (
                                        <p><strong>Technician 2:</strong> {order.technician_name_2}</p>
                                    )}
                                    {order.findings_diagnosis && (
                                        <p><strong>Findings/Diagnosis:</strong> {order.findings_diagnosis}</p>
                                    )}
                                    {order.parts_needed && order.parts_needed.length > 0 && (
                                        <div>
                                            <p><strong>Parts Needed:</strong></p>
                                            <ul>
                                                {order.parts_needed.map((part, index) => (
                                                    <li key={index}>
                                                        {part.partName || part}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
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
                                                            src={typeof url === 'string' ? url : url.data} 
                                                            alt={`Media file ${fileIndex + 1}`}
                                                            className="media-image"
                                                            onClick={() => window.open(typeof url === 'string' ? url : url.data, '_blank')}
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
            {editingJobOrder && (
                <EditJobOrderModal
                    jobOrder={editingJobOrder}
                    onClose={handleCloseEditModal}
                    onSave={handleSaveEditedJobOrder}
                    isOnline={!connectionError}
                />
            )}
        </div>
    );
};

export default AdminPage;