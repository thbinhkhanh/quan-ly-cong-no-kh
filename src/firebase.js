// Import các hàm cần thiết từ Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Cấu hình Firebase cho dự án Thuận Phát
const firebaseConfig = {
  apiKey: "AIzaSyD37xLsQkyTJDtLFMRAmnuzLvOeByZ2QG8",
  authDomain: "quanlycongno-thuanphat.firebaseapp.com",
  projectId: "quanlycongno-thuanphat",
  storageBucket: "quanlycongno-thuanphat.firebasestorage.app",
  messagingSenderId: "1064606812545",
  appId: "1:1064606812545:web:cf543dc20cd0c5eabdc080"
};

// Khởi tạo Firebase và Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);