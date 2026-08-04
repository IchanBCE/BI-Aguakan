// ============================================================
// generar-manifest.js
//
// Qué hace: recorre la carpeta Reportes/, encuentra todos los
// archivos .html, lee el bloque de metadatos de cada uno
// (<script id="meta">...</script>) y junta todo en un solo
// archivo manifest.json en la raíz del repositorio.
//
// Este script lo ejecuta GitHub Actions solo, cada vez que
// subes algo nuevo. No necesitas correrlo tú a mano.
// ============================================================

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const CARPETA_REPORTES = path.join(RAIZ, 'Reportes');
const ARCHIVO_SALIDA = path.join(RAIZ, 'manifest.json');

// Busca archivos .html dentro de una carpeta, incluyendo subcarpetas
function buscarHtml(carpeta) {
  let encontrados = [];
  if (!fs.existsSync(carpeta)) return encontrados;

  const items = fs.readdirSync(carpeta, { withFileTypes: true });
  for (const item of items) {
    const rutaCompleta = path.join(carpeta, item.name);
    if (item.isDirectory()) {
      encontrados = encontrados.concat(buscarHtml(rutaCompleta));
    } else if (item.isFile() && item.name.toLowerCase().endsWith('.html')) {
      encontrados.push(rutaCompleta);
    }
  }
  return encontrados;
}

// Lee un archivo .html y extrae su bloque de metadatos
function extraerMetadatos(rutaArchivo) {
  const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
  const match = contenido.match(/<script[^>]*id=["']meta["'][^>]*>([\s\S]*?)<\/script>/i);

  if (!match) {
    console.warn(`Aviso: "${rutaArchivo}" no tiene bloque de metadatos. Se omite del manifest.`);
    return null;
  }

  try {
    const datos = JSON.parse(match[1]);
    // Ruta relativa a la raíz del repo, para usarla como link en index.html
    datos.ruta = path.relative(RAIZ, rutaArchivo).split(path.sep).join('/');
    return datos;
  } catch (error) {
    console.warn(`Aviso: "${rutaArchivo}" tiene metadatos con error de formato JSON. Se omite.`);
    return null;
  }
}

// ---- Proceso principal ----

const archivosHtml = buscarHtml(CARPETA_REPORTES);

const dashboards = archivosHtml
  .map(extraerMetadatos)
  .filter(item => item !== null);

// Ordena del más reciente al más antiguo
dashboards.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

const manifest = {
  generado: new Date().toISOString(),
  total: dashboards.length,
  dashboards: dashboards
};

fs.writeFileSync(ARCHIVO_SALIDA, JSON.stringify(manifest, null, 2));

console.log(`Listo: manifest.json generado con ${dashboards.length} dashboard(s).`);
