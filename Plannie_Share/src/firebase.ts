import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0InkrX9dvAif0ScUG7ns9Suy97prQrc0",
  authDomain: "studio-3767863186-8398d.firebaseapp.com",
  projectId: "studio-3767863186-8398d",
  storageBucket: "studio-3767863186-8398d.firebasestorage.app",
  messagingSenderId: "237648529829",
  appId: "1:237648529829:web:97d869390f9424d9cb404c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

