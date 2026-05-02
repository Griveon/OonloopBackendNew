import XLSX from "xlsx";

export const readHSNFile = () => {
    const filePath = "C:\\Users\\Aaditya\\Downloads\\NEW HSN CODE  (2).xlsx";

    const workbook = XLSX.readFile(filePath);

    console.log("All Sheets:", workbook.SheetNames);

    // 🔥 USE SECOND SHEET
    const sheetName: any = workbook.SheetNames[1];
    const sheet: any = workbook.Sheets[sheetName];

    console.log("Using Sheet:", sheetName);
    console.log("Range:", sheet["!ref"]);

    const data = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false
    });

    console.log("Total rows:", data.length);

    return data;
};