import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const env = import.meta.env
// Same Firebase project as the mobile app (lib/firebase_options.dart → web)
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDf7dPJ4uwRymomi-VifXIIuHStkjrNOTA',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'bpsa-8bde0.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'bpsa-8bde0',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'bpsa-8bde0.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '199781494931',
  appId: env.VITE_FIREBASE_APP_ID || '1:199781494931:web:44e9399fb39a2eb596dd66',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-37XN1MV1QJ',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'us-central1')
