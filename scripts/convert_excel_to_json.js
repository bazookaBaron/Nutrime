const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_FILE = path.resolve(__dirname, '../../processed_nutrition.xlsx');
const OUTPUT_FILE = path.resolve(__dirname, '../assets/food_data.json');

try {
    console.log(`Reading Excel file from: ${EXCEL_FILE}`);
    if (!fs.existsSync(EXCEL_FILE)) {
        console.error(`Error: Excel file not found at ${EXCEL_FILE}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rawData.length} items. Mapping data...`);

    const processedData = rawData.map((item, index) => {
        return {
            id: index.toString(),
            name: item["Food"] ? item["Food"].trim() : "Unknown Food",
            unit: item["Measure Unit"] || "",
            calories: item["Caloric Value"] || 0,
            fat: item["Fat( in g)"] || 0,
            carbs: item["Carbohydrates( in g)"] || 0,
            protein: item["Protein( in g)"] || 0,
            cholesterol: item["Cholesterol( in mg)"] || 0,
            vitaminA: item["Vitamin A( in mg)"] || 0,
            vitaminC: item["Vitamin C( in mg)"] || 0,
            calcium: item["Calcium( in mg)"] || 0,
            iron: item["Iron( in mg)"] || 0,
            magnesium: item["Magnesium( in mg)"] || 0,
        };
    });

    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedData, null, 2));
    console.log(`Successfully wrote ${processedData.length} items to ${OUTPUT_FILE}`);

} catch (error) {
    console.error("Error converting Excel to JSON:", error);
    process.exit(1);
}
