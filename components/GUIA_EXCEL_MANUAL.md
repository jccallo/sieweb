# Guía: Generación y Exportación Manual de Excel (xlsx)

Esta guía explica cómo generar un archivo Excel manualmente (sin usar el `ExcelService`) y enviarlo al frontend para su descarga.

## 1. Backend (Node.js + Express)

En tu controlador o DTO, puedes seguir estos pasos. Asegúrate de tener `require('xlsx')`.

```javascript
const XLSX = require('xlsx');
const moment = require('moment'); // Opcional para fechas

async function exportarManual(params) {
    const response = this.response;

    // --- A. Tus datos (Arreglo de Objetos) ---
    const datos = [
        { "ID": 1, "Nombre": "Juan Perez", "Monto": 150.50, "Fecha": "2024-01-20" },
        { "ID": 2, "Nombre": "Maria Lopez", "Monto": 200.00, "Fecha": "2024-01-21" },
        { "ID": 3, "Nombre": "Estudiante con nombre muy largo", "Monto": 0.00, "Fecha": "2024-01-22" }
    ];

    // --- B. Crear Libro (Workbook) y Hoja (Worksheet) ---
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);

    // --- C. Ajuste de Ancho Automático (Opcional) ---
    const anchos = Object.keys(datos[0]).map(key => {
        let maxLen = key.toString().length;
        datos.forEach(item => {
            const cellLen = item[key] ? item[key].toString().length : 0;
            if (cellLen > maxLen) maxLen = cellLen;
        });
        return { wch: maxLen + 2 }; // +2 de margen
    });
    ws['!cols'] = anchos;

    // --- D. Añadir Hoja con Nombre Personalizado y Generar Buffer ---
    const nombreHoja = "Mi_Reporte_Personalizado"; // <--- AQUÍ pones el nombre de la pestaña
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // --- E. Enviar al Navegador ---
    const nombreArchivo = `Reporte_${moment().format('YYYYMMDD')}.xlsx`;
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    
    return response.status(200).send(buffer);
}
```

## 2. Frontend (Vue 3 / Quasar)

Es crucial configurar `responseType: 'blob'` para que el archivo no se corrompa.

```javascript
<script setup>
import { $http } from 'boot/axios';
import download from 'utils/download'; // Utilidad existente en tu proyecto

const descargarExcel = async () => {
    try {
        const res = await $http.get('/api/reporte/exportar', {
            params: { /* tus filtros */ },
            responseType: 'blob', // INDICAR QUE ES UN ARCHIVO
            original: true        // Saltar interceptores de datos planos
        });

        // La utilidad download.js de Quasar se encarga de todo
        // (Funciona en PC y en móviles Android/iOS vía Cordova)
        download(res.data, 'Mi_Reporte.xlsx');
        
    } catch (e) {
        console.error("Error al descargar", e);
    }
};
</script>
```

## Resumen de pasos críticos

1. **Backend**: Usar `XLSX.write(wb, { type: 'buffer' })`.
2. **Backend**: Configurar las cabeceras `Content-Type` y `Content-Disposition`.
3. **Frontend**: Usar `responseType: 'blob'` en la petición Axios.
4. **Frontend**: Usar la función `download(blob, nombre)` de tu proyecto para manejar la descarga de forma multiplataforma.
