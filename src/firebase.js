import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCCix4NMt8ri6AcPIwGWAYGtdlaJWXYoZQ",
  authDomain: "todo-list-6df0c.firebaseapp.com",
  databaseURL: "https://todo-list-6df0c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "todo-list-6df0c",
  storageBucket: "todo-list-6df0c.appspot.com",
  messagingSenderId: "458386869237",
  appId: "1:458386869237:web:2e863b48453ad39c1eeebc"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);