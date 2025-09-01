import { useEffect, useState, useCallback, useRef } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'MondoCucinaDB';
const DB_VERSION = 1;
const STORE_NAME = 'jobOrders';

// Singleton database connection for better performance
let dbConnection = null;
let dbPromise = null;

const getDatabase = async () => {
    if (dbConnection) return dbConnection;
    
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('status', 'status');
                    store.createIndex('caseNumber', 'caseNumber');
                }
            },
        });
    }
    
    dbConnection = await dbPromise;
    return dbConnection;
};

export const useOfflineStorage = () => {
    const [db, setDb] = useState(null);
    const initializeRef = useRef(false);

    useEffect(() => {
        const initDB = async () => {
            if (initializeRef.current) return;
            initializeRef.current = true;
            
            try {
                const database = await getDatabase();
                setDb(database);
            } catch (error) {
                console.error('Failed to initialize database:', error);
            }
        };

        initDB();
    }, []);

    const saveJobOrder = useCallback(async (jobOrder) => {
        const database = db || await getDatabase();
        if (!database) return false;
        
        try {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            await tx.store.put({
                ...jobOrder,
                status: 'pending',
                localId: Date.now()
            });
            await tx.done;
            return true;
        } catch (error) {
            console.error('Failed to save job order:', error);
            return false;
        }
    }, [db]);

    const getPendingJobOrders = useCallback(async () => {
        const database = db || await getDatabase();
        if (!database) return [];
        
        try {
            return await database.getAllFromIndex(STORE_NAME, 'status', 'pending');
        } catch (error) {
            console.error('Failed to get pending job orders:', error);
            return [];
        }
    }, [db]);

    const removeSyncedJobOrder = useCallback(async (caseNumber) => {
        const database = db || await getDatabase();
        if (!database) return null;
        
        try {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.store;
            
            // Get all pending orders
            const pendingOrders = await store.index('status').getAll('pending');
            
            // Find the order with matching case number
            const orderToRemove = pendingOrders.find(order => order.caseNumber === caseNumber);
            
            if (orderToRemove) {
                await store.delete(orderToRemove.id);
            }
            
            await tx.done;
            return orderToRemove;
        } catch (error) {
            console.error('Failed to remove synced job order:', error);
            return null;
        }
    }, [db]);

    const clearSyncedJobOrders = useCallback(async (caseNumbers) => {
        const database = db || await getDatabase();
        if (!database || !caseNumbers.length) return;
        
        try {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.store;
            
            // Get all pending orders
            const pendingOrders = await store.index('status').getAll('pending');
            
            // Remove orders with matching case numbers in batch
            const deletePromises = pendingOrders
                .filter(order => caseNumbers.includes(order.caseNumber))
                .map(order => store.delete(order.id));
            
            await Promise.all(deletePromises);
            await tx.done;
        } catch (error) {
            console.error('Failed to clear synced job orders:', error);
        }
    }, [db]);

    return { saveJobOrder, getPendingJobOrders, removeSyncedJobOrder, clearSyncedJobOrders };
};