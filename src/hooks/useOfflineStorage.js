import { useEffect, useState } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'MondoCucinaDB';
const DB_VERSION = 1;
const STORE_NAME = 'jobOrders';

export const useOfflineStorage = () => {
    const [db, setDb] = useState(null);

    useEffect(() => {
        const initDB = async () => {
            const database = await openDB(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        store.createIndex('status', 'status');
                    }
                },
            });
            setDb(database);
        };

        initDB();
    }, []);

    const saveJobOrder = async (jobOrder) => {
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.store.put({
            ...jobOrder,
            status: 'pending',
            localId: Date.now()
        });
        await tx.done;
        return true;
    };

    const getPendingJobOrders = async () => {
        if (!db) return [];
        return db.getAllFromIndex(STORE_NAME, 'status', 'pending');
    };

    const removeSyncedJobOrder = async (caseNumber) => {
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
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
    };

    const clearSyncedJobOrders = async (caseNumbers) => {
        if (!db || !caseNumbers.length) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.store;
        
        // Get all pending orders
        const pendingOrders = await store.index('status').getAll('pending');
        
        // Remove orders with matching case numbers
        for (const order of pendingOrders) {
            if (caseNumbers.includes(order.caseNumber)) {
                await store.delete(order.id);
            }
        }
        
        await tx.done;
    };

    return { saveJobOrder, getPendingJobOrders, removeSyncedJobOrder, clearSyncedJobOrders };
};