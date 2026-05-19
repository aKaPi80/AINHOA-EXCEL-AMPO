const fs = require("node:fs");
const path = require("node:path");
const { buildData, convertRows, parseCsv } = require("./convert-csv-to-json.cjs");

const sourceUrl = process.env.SHAREPOINT_EXCEL_URL || process.argv[2];
const outputPath = process.argv[3] || path.join(__dirname, "data", "torque-data.json");
const tempPath = path.join(__dirname, ".downloaded-source");

if (!sourceUrl) {
  throw new Error("Falta SHAREPOINT_EXCEL_URL o el primer argumento con el enlace del Excel.");
}

function rowsFromDownloadedFile(filePath, contentType = "") {
  const ext = path.extname(filePath).toLowerCase();

  if (contentType.includes("csv") || ext === ".csv") {
    return [{ sheetName: "Pares CSV", rows: parseCsv(fs.readFileSync(filePath, "utf8")) }];
  }

  const XLSX = require("xlsx");
  const workbook = XLSX.readFile(filePath, { cellDates: false });

  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: "",
    }),
  }));
}

function sheetNameToXylan(sheetName, workbookHasXylanSheet) {
  const normalized = sheetName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("sin") && normalized.includes("xylan")) {
    return "no";
  }

  if (normalized.includes("xylan")) {
    return "yes";
  }

  if (workbookHasXylanSheet) {
    return "no";
  }

  return "not_specified";
}

async function main() {
  if (/^https?:\/\//i.test(sourceUrl)) {
    throw new Error("Este script espera un archivo local en GitHub Actions. El workflow descarga primero source.xlsm.");
  }

  if (!fs.existsSync(sourceUrl)) {
    throw new Error(`No existe el archivo local: ${sourceUrl}`);
  }

  const sheets = rowsFromDownloadedFile(sourceUrl);
  const candidateSheets = sheets.filter((sheet) => {
    const normalized = sheet.sheetName.toLowerCase();
    return normalized.includes("pares") || normalized.includes("xylan");
  });

  const sheetsToConvert = candidateSheets.length > 0 ? candidateSheets : sheets;
  const workbookHasXylanSheet = sheetsToConvert.some((sheet) =>
    sheet.sheetName.toLowerCase().includes("xylan")
  );

  const records = [];
  const convertedSheetNames = [];

  for (const sheet of sheetsToConvert) {
    try {
      const sheetRecords = convertRows(sheet.rows, {
        xylan: sheetNameToXylan(sheet.sheetName, workbookHasXylanSheet),
      });

      records.push(...sheetRecords);
      convertedSheetNames.push(sheet.sheetName);
    } catch (error) {
      console.warn(`Saltando hoja ${sheet.sheetName}: ${error.message}`);
    }
  }

  if (records.length === 0) {
    throw new Error("No se genero ningun registro desde el Excel descargado.");
  }

  const data = buildData(records, {
    sourceFile: path.basename(sourceUrl),
    sourceSheet: convertedSheetNames.join(", "),
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Generated ${records.length} records from ${convertedSheetNames.join(", ")}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
