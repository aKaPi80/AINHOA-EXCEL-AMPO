const fs = require("node:fs");
const path = require("node:path");

const inputPath = process.argv[2] || "C:/Users/alvar/Desktop/esparrago-aprieteak_v3(Pares).csv";
const outputPath = process.argv[3] || path.join(__dirname, "data", "torque-data.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ";" && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function clean(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toNumber(value) {
  const text = clean(value);
  if (!text) {
    return null;
  }

  const number = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function findRow(rows, text) {
  const needle = normalize(text);
  return rows.findIndex((row) => row.some((cell) => normalize(cell).includes(needle)));
}

function findSizeRow(rows, startIndex) {
  for (let index = startIndex; index < rows.length; index += 1) {
    if (normalize(rows[index]?.[0]) === "size") {
      return index;
    }
  }

  return -1;
}

function materialGroupsFromRow(row) {
  const groups = [];

  for (let column = 1; column < row.length - 2; column += 3) {
    const material = clean(row[column]);
    if (material) {
      groups.push({ column, material });
    }
  }

  return groups;
}

function convertRows(rows, options = {}) {
  const preloadTitleRow = findRow(rows, "Fuerzas de precarga");
  const torqueTitleRow = findRow(rows, "PARES DE APRIETE");

  if (preloadTitleRow === -1 || torqueTitleRow === -1) {
    throw new Error("No se han encontrado los bloques 'Fuerzas de precarga' y 'PARES DE APRIETE'.");
  }

  const preloadSizeRow = findSizeRow(rows, preloadTitleRow);
  const torqueSizeRow = findSizeRow(rows, torqueTitleRow);

  if (preloadSizeRow === -1 || torqueSizeRow === -1) {
    throw new Error("No se han encontrado las filas SIZE de precarga y pares.");
  }

  const preloadMaterialRow = rows[preloadSizeRow - 1] || [];
  const torqueMaterialRow = rows[torqueSizeRow - 1] || [];
  const groups = materialGroupsFromRow(torqueMaterialRow);
  const preloadRowsBySize = new Map();

  for (let rowIndex = preloadSizeRow + 1; rowIndex < torqueTitleRow; rowIndex += 1) {
    const size = clean(rows[rowIndex]?.[0]);
    if (size) {
      preloadRowsBySize.set(size, rows[rowIndex]);
    }
  }

  const records = [];

  for (let rowIndex = torqueSizeRow + 1; rowIndex < rows.length; rowIndex += 1) {
    const torqueRow = rows[rowIndex] || [];
    const size = clean(torqueRow[0]);
    if (!size) {
      continue;
    }

    const preloadRow = preloadRowsBySize.get(size);
    if (!preloadRow) {
      continue;
    }

    for (const group of groups) {
      const preloadMaterial = clean(preloadMaterialRow[group.column]);
      const material = group.material || preloadMaterial;

      records.push({
        size,
        material,
        xylan: options.xylan || "not_specified",
        preloadSy: toNumber(preloadRow[group.column]),
        preloadMinN: toNumber(preloadRow[group.column + 1]),
        preloadMaxN: toNumber(preloadRow[group.column + 2]),
        torqueMinNm: toNumber(torqueRow[group.column + 1]),
        torqueMaxNm: toNumber(torqueRow[group.column + 2]),
      });
    }
  }

  return records;
}

function buildData(records, metadata = {}) {
  const xylanValues = [...new Set(records.map((record) => record.xylan))];
  const xylanAvailable = xylanValues.includes("yes") && xylanValues.includes("no");

  return {
    sourceFile: metadata.sourceFile || path.basename(inputPath),
    sourceSheet: metadata.sourceSheet || "Pares CSV",
    generatedAt: new Date().toISOString(),
    xylanAvailable,
    note: xylanAvailable
      ? "Datos generados desde tablas separadas con y sin Xylan."
      : "El origen recibido no incluye una tabla separada para Xylan; el selector queda preparado para cuando exista el segundo CSV o pestana.",
    sizes: [...new Set(records.map((record) => record.size))],
    materials: [...new Set(records.map((record) => record.material))],
    records,
  };
}

if (require.main === module) {
  const csv = fs.readFileSync(inputPath, "utf8");
  const rows = parseCsv(csv);
  const records = convertRows(rows, { xylan: "not_specified" });
  const data = buildData(records);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Generated ${records.length} records, ${data.materials.length} materials, ${data.sizes.length} sizes.`);
}

module.exports = {
  buildData,
  convertRows,
  parseCsv,
};
