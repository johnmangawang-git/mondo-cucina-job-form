import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineStorage } from '../hooks/useOfflineStorage';
import { supabase } from '../api/supabase';
import { downloadAsCSV, downloadAsPDF } from '../utils/exportUtils';

const AdminPage = () => {
    const navigate = useNavigate();
    const { getPendingJobOrders, clearSyncedJobOrders } = useOfflineStorage();
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
            setPendingOrders(pending || []);
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
                setJobOrders(supabaseOrders || []);
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
        return [
            ...pendingOrders.map(item => ({...item, type: 'pending'})), 
            ...jobOrders.map(item => ({...item, type: 'synced'}))
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
                }));
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
    }, [pendingOrders, isSupabaseConfigured, clearSyncedJobOrders, loadJobOrders]);

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