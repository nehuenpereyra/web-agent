
import { spawn } from "child_process";
import path from "path";

export function extractEntities(text: string) {
  return new Promise((resolve, reject) => {

    const scriptPath = path.resolve("python", "extract_entities.py");
    const proc = spawn("uv", ["run", scriptPath], {
      cwd: path.resolve("python"),
      stdio: ["pipe", "pipe", "inherit"],
    });

    let output = "";
    proc.stdout.on("data", (data) => (output += data.toString()));
    proc.on("error", reject);
    proc.on("close", () => {
      try {
        resolve(JSON.parse(output));
      } catch (e) {
        reject(e);
      }
    });

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

const test = async () => {
  const text = "La creación del Instituto de Astrofísica de La Plata (IALP) tuvo lugar el 10 de junio de 1999, mediante la Resolución de Directorio No 1302 del Consejo Nacional de Investigaciones Científicas y Técnicas (CONICET). El Instituto tuvo su origen en la fusión de dos programas de investigación científica previos de CONICET: el Programa de Fotometría y Estructura Galáctica (PROFOEG) y el Programa de Estrellas Binarias Interactuantes, Estrellas Be y Radiación Gama de muy Altas Energías (PROBIBEGA). El PROFOEG había sido creado en 1982, a solicitud de los Dres. Alejandro Feinstein y Juan Carlos Muzzio y del Ing. Pastor J. Sierra (por entonces Director del Observatorio Astronómico de La Plata y luego Facultad de Ciencias Astronómicas y Geofísicas de la Universidad Nacional de La Plata). Por su parte, el PROBIBEGA había surgido en 1996 a partir de la iniciativa del Dr. Jorge Sahade quien fue, oportunamente, su director. En sus inicios y por poco tiempo, la dirección del IALP fue compartida por los Dres. Feinstein y Sahade pero, hasta el año 2001, fue el Dr. Feinstein quien permaneció como Director del Instituto. A continuación, la dirección paso a manos del Dr. J. C. Muzzio, quien ocupó dicho cargo hasta el año 2015. En esa fecha asumió la dirección el Dr. Omar Benvenuto, quien culminó su mandato en 2021. Actualmente, su dirección esta a cargo del Dr. Favio R. Faifer.";
  const result = await extractEntities(text);
  console.log(result);
}
test();