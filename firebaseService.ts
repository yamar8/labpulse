import {
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { AppData, Experiment, Task } from './types';

// Collection References
const USERS_COLLECTION = 'users';

export const saveUserData = async (userId: string, data: AppData) => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await setDoc(userRef, data, { merge: true });
    } catch (error) {
        console.error("Error saving user data:", error);
        throw error;
    }
};

export const loadUserData = async (userId: string): Promise<AppData | null> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data() as AppData;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        throw error;
    }
};

export const subscribeToUserData = (userId: string, callback: (data: AppData) => void) => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as AppData);
        }
    });
};
