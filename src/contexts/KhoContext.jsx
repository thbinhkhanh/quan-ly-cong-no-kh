import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from "../firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import ExcelJS from 'exceljs';

const KhoContext = createContext();

const formatCustomerId = (name) => {
  if (!name) return "SAN_PHAM_MOI";
  return String(name)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
};

export function KhoProvider({ children }) {
  const [items, setItems] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loadingFirestore, setLoadingFirestore] = useState(false);
  const [savingFirestore, setSavingFirestore] = useState(false);

  // Hàm trích xuất giá trị ô ExcelJS
  const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.result !== undefined) return cell.value.result;
      if (cell.value.text !== undefined) return cell.value.text;
      return '';
    }
    return cell.value;
  };

  const parseNumericCell = (cell) => {
    const val = getCellValue(cell);
    if (val === '' || val === '-' || val === null || val === undefined) return '-';
    const num = Number(val);
    return isNaN(num) ? val : num;
  };

  // Tải dữ liệu từ collection "DANHMUC" trên Firestore
  const loadFromFirestore = async () => {
    try {
      setLoadingFirestore(true);
      const danhMucRef = collection(db, "DANHMUC");
      const querySnapshot = await getDocs(danhMucRef);

      const loadedData = [];
      let index = 1;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedData.push({
          stt: index++,
          name: data.name || docSnap.id,
          company: data.company || '',
          unit: data.unit || '',
          price: data.price || 0,
          qtyImport: data.qtyImport ?? '-',
          km: data.km ?? '-',
          qtyExport: data.qtyExport ?? '-',
          qtyStock: data.qtyStock ?? '-',
          weight: data.weight ?? '-',
          food: data.food || '',
          medicine: data.medicine || '',
        });
      });

      if (loadedData.length > 0) {
        setItems(loadedData);
        setFileName("Dữ liệu từ Firestore (DANHMUC)");
        return { success: true, count: loadedData.length };
      } else {
        return { success: false, message: "Collection DANHMUC trên Firestore hiện đang trống!" };
      }
    } catch (error) {
      console.error("Lỗi đọc dữ liệu Firestore:", error);
      throw error;
    } finally {
      setLoadingFirestore(false);
    }
  };

  // Tự động tải dữ liệu khi khởi chạy ứng dụng lần đầu
  useEffect(() => {
    loadFromFirestore();
  }, []);

  // Ghi dữ liệu lên Firestore
  const saveToFirestore = async (currentItems) => {
    const targetItems = currentItems || items;
    if (targetItems.length === 0) return { success: false, message: "Không có dữ liệu để ghi!" };

    try {
      setSavingFirestore(true);
      const danhMucRef = collection(db, "DANHMUC");

      for (const item of targetItems) {
        const docId = formatCustomerId(item.name);
        const productDocRef = doc(danhMucRef, docId);

        await setDoc(productDocRef, {
          productId: docId,
          name: item.name || '',
          company: item.company || '',
          unit: item.unit || '',
          price: Number(item.price) || 0,
          qtyImport: item.qtyImport,
          km: item.km,
          qtyExport: item.qtyExport,
          qtyStock: item.qtyStock,
          weight: item.weight,
          food: item.food || '',
          medicine: item.medicine || '',
          updatedAt: Date.now()
        }, { merge: true });
      }

      return { success: true, count: targetItems.length };
    } catch (error) {
      console.error("Lỗi ghi Firestore:", error);
      throw error;
    } finally {
      setSavingFirestore(false);
    }
  };

  // Import từ file Excel
  const importExcelFile = async (file) => {
    try {
      const arrayBuffer = file.arrayBuffer ? await file.arrayBuffer() : await new Response(file).arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      const parsedData = [];

      worksheet.eachRow((row) => {
        const col1 = String(getCellValue(row.getCell(1))).trim();
        const col2 = String(getCellValue(row.getCell(2))).trim();
        const col3 = String(getCellValue(row.getCell(3))).trim();
        const rowText = `${col1} ${col2} ${col3}`.toUpperCase();

        if (
          !col2 ||
          rowText.includes("STT") ||
          rowText.includes("TÊN HÀNG") ||
          rowText.includes("BẢNG NHẬP") ||
          rowText.includes("CÔNG TY") ||
          rowText.includes("ĐƠN GIÁ")
        ) {
          return;
        }

        parsedData.push({
          stt: col1 || parsedData.length + 1,
          name: col2,
          company: col3,
          unit: String(getCellValue(row.getCell(4)) || ''),
          price: parseNumericCell(row.getCell(6)),
          qtyImport: parseNumericCell(row.getCell(7)),
          km: parseNumericCell(row.getCell(8)),
          qtyExport: parseNumericCell(row.getCell(9)),
          qtyStock: parseNumericCell(row.getCell(10)),
          weight: parseNumericCell(row.getCell(11)),
          food: String(getCellValue(row.getCell(12)) || ''),
          medicine: String(getCellValue(row.getCell(13)) || ''),
        });
      });

      setItems(parsedData);
      setFileName(file.name);
      return { success: true, count: parsedData.length };
    } catch (error) {
      console.error("Lỗi đọc file Excel:", error);
      throw error;
    }
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        stt: prev.length + 1,
        name: 'Mặt hàng mới',
        company: 'Công ty',
        unit: 'Bao',
        price: 0,
        qtyImport: '-',
        km: '-',
        qtyExport: '-',
        qtyStock: '-',
        weight: '-',
        food: '',
        medicine: '',
      },
    ]);
  };

  return (
    <KhoContext.Provider
      value={{
        items,
        setItems,
        fileName,
        setFileName,
        loadingFirestore,
        savingFirestore,
        loadFromFirestore,
        saveToFirestore,
        importExcelFile,
        addRow,
      }}
    >
      {children}
    </KhoContext.Provider>
  );
}

export function useKho() {
  return useContext(KhoContext);
}