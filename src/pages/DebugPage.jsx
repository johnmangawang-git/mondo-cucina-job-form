import React, { useState, useEffect } from 'react';
import { useOfflineStorage } from '../hooks/useOfflineStorage';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { downloadAsJSON, downloadAsCSV, downloadIndividualJobOrder } from '../utils/exportUtils';

const DebugPage = () => {
    const { getPendingJobOrders } = useOfflineStorage();
    const [storedData, setStoredData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        setLoading(true);
        try {
            const data = await getPendingJobOrders();
            setStoredData(data || []);
        } catch (error) {
            console.error('Error loading stored data:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearAllData = async () => {
        if (confirm('Are you sure you want to clear all offline data?')) {
            try {
                // Clear IndexedDB
                const databases = await indexedDB.databases();
                await Promise.all(
                    databases.map(db => {
                        if (db.name === 'MondoCucinaDB') {
                            return new Promise((resolve, reject) => {
                                const deleteReq = indexedDB.deleteDatabase(db.name);
                                deleteReq.onsuccess = () => resolve();
                                deleteReq.onerror = () => reject(deleteReq.error);
                            });
                        }
                    })
                );
                alert('All offline data cleared!');
                setStoredData([]);
            } catch (error) {
                console.error('Error clearing data:', error);
                alert('Error clearing data');
            }
        }
    };

    if (loading) {
        return (
            <div className="debug-page">
                <h1>Loading stored data...</h1>
            </div>
        );
    }

    return (
        <div className="debug-page" style={{ padding: '20px', fontFamily: 'monospace' }}>
            <PageHeader
                title="Debug: Stored Data"
                subtitle={`Found ${storedData.length} stored form(s)`}
                backPath="/admin"
                backLabel="← Back to Dashboard"
                rightContent={
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <Button onClick={loadStoredData} variant="secondary" size="small">
                            Refresh Data
                        </Button>
                        <Button 
                            onClick={clearAllData} 
                            variant="danger" 
                            size="small"
                        >
                            Clear All Data
                        </Button>
                        {storedData.length > 0 && (
                            <>
                                <Button 
                                    onClick={() => downloadAsJSON(storedData, 'offline-job-orders')} 
                                    variant="outline" 
                                    size="small"
                                >
                                    📄 Export JSON
                                </Button>
                                <Button 
                                    onClick={() => downloadAsCSV(storedData, 'offline-job-orders')} 
                                    variant="outline" 
                                    size="small"
                                >
                                    📊 Export CSV
                                </Button>
                            </>
                        )}
                    </div>
                }
            />



            {storedData.length === 0 ? (
                <p>No offline data found.</p>
            ) : (
                storedData.map((item, index) => (
                    <div 
                        key={index} 
                        style={{ 
                            border: '1px solid #ccc', 
                            margin: '10px 0', 
                            padding: '15px',
                            backgroundColor: '#f9f9f9',
                            borderRadius: '5px'
                        }}
                    >
                        <h3>Form #{index + 1}</h3>
                        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                            <p><strong>Case Number:</strong> {item.caseNumber}</p>
                            <p><strong>Customer:</strong> {item.customerName}</p>
                            <p><strong>SKU:</strong> {item.sku}</p>
                            <p><strong>Date Created:</strong> {item.createdAt}</p>
                            <p><strong>Status:</strong> {item.status}</p>
                            <p><strong>Signature:</strong> {item.signatureData ? 'YES ✓' : 'NO ✗'}</p>
                            <p><strong>Media Files:</strong> {item.mediaFiles?.length || 0}</p>
                            
                            {item.signatureData && (
                                <div style={{ marginTop: '10px' }}>
                                    <p><strong>Signature Preview:</strong></p>
                                    <img 
                                        src={item.signatureData} 
                                        alt="Signature" 
                                        style={{ 
                                            maxWidth: '200px', 
                                            border: '1px solid #ddd',
                                            backgroundColor: 'white'
                                        }} 
                                    />
                                </div>
                            )}
                            
                            <div style={{ marginTop: '10px' }}>
                                <Button 
                                    onClick={() => downloadIndividualJobOrder(item)}
                                    variant="outline"
                                    size="small"
                                >
                                    📥 Export This Form
                                </Button>
                            </div>
                            
                            <details style={{ marginTop: '10px' }}>
                                <summary>View Raw Data</summary>
                                <pre style={{ 
                                    fontSize: '10px', 
                                    overflow: 'auto', 
                                    backgroundColor: '#fff',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    marginTop: '5px'
                                }}>
                                    {JSON.stringify(item, null, 2)}
                                </pre>
                            </details>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default DebugPage;