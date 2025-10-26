import { writeFileSync } from "fs";
import fs from "fs";

export const generateCsv = (data: any[]) => {
  const headers = Object.keys(data[0]);

  const filas = data.map((obj) =>
    headers
      .map((header) => JSON.stringify(obj[header as keyof any] ?? ""))
      .join(",")
  );

  const csv = [headers.join(","), ...filas].join("\n");

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  const fileName = `data_${timestamp}.csv`;

  const outputDir = "./src/scraping/data/csv";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  writeFileSync(outputDir + "/" + fileName, csv);
};
