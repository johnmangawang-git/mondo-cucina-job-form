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

    return { saveJobOrder, getPendingJobOrders };
};