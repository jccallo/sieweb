const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const SieError = require('./sieError');
const { getRequest } = require('../middleware/context');

/**
 * Retorna la ruta física absoluta de los archivos del proyecto solicitado.
 * Realiza validaciones de tipo de proyecto y existencia física en el servidor.
 * 
 * @param {string} project - 'node' o 'php' (opcional, default 'node')
 * @returns {string} - Ruta absoluta validada.
 * @throws {SieError} - Si el proyecto es inválido o la ruta no existe.
 */
const getRutaProyecto = function (project = 'node') {
    // 1. Validar que el proyecto sea uno de los permitidos
    if (project !== 'node' && project !== 'php') {
        throw new SieError(`El tipo de proyecto '${project}' es inválido. Debe ser 'node' o 'php'.`);
    }

    // 2. Resolver la ruta raíz usando la constante global ROOTDIR (definida en server-constantes.js)
    const nodeRoot = (typeof ROOTDIR !== 'undefined') ? ROOTDIR : path.resolve(__dirname, '../..');

    let outputPath;
    if (project === 'php') {
        // Estructura esperada: la carpeta webpg que está al mismo nivel que siewebjs
        outputPath = path.resolve(nodeRoot, '../webpg');
    } else {
        // Estructura esperada: la raíz del proyecto Node (ROOTDIR)
        outputPath = nodeRoot;
    }

    // 3. Validar existencia física del directorio raíz en el servidor
    if (!fs.existsSync(outputPath)) {
        throw new SieError(`La raíz del proyecto '${project}' no existe en el servidor: ${outputPath}`);
    }

    return outputPath;
};

/**
 * Obtiene el nombre y código del colegio desde el contexto de la petición actual.
 * @returns {object} - { nombre, colcod }
 * @throws {SieError} - Si no se puede determinar la información del colegio.
 */
const getColegio = () => {
    const req = getRequest();
    const token = req ? req.usu : null;

    // Priorizamos COLEGIO y COLCOD del token o env
    const nombre = (token && token.COLEGIO);
    const colcod = (token && token.COLCOD);

    if (!nombre || !colcod) {
        throw new SieError("No se pudo determinar el nombre o el código del colegio (colcod).");
    }

    return { nombre, colcod };
};

/**
 * Asegura que una carpeta exista. Si no existe, la crea de forma recursiva.
 * @param {string} rutaCompletaCarpeta - Ruta de la carpeta a asegurar.
 * @throws {SieError} - Si la ruta es inválida o falla la creación.
 */
const crearCarpetaSiNoExiste = (rutaCompletaCarpeta) => {
    if (!rutaCompletaCarpeta) {
        throw new SieError("La ruta de la carpeta es requerida.");
    }

    if (!fs.existsSync(rutaCompletaCarpeta)) {
        try {
            fs.mkdirSync(rutaCompletaCarpeta, { recursive: true });
        } catch (err) {
            throw new SieError(`Error al crear la carpeta: ${rutaCompletaCarpeta}. Detalle: ${err.message}`);
        }
    }
};

/**
 * Verifica si un archivo o carpeta existe físicamente.
 * Acepta una ruta completa o múltiples segmentos que serán unidos con path.join.
 * 
 * @param {...string} rutasSegmentos - Ruta completa o segmentos de ruta a unir
 * @returns {string} - Ruta normalizada y validada
 * @throws {SieError} - Si la ruta no existe o contiene path traversal
 */
const verificarExistencia = (...rutasSegmentos) => {
    if (rutasSegmentos.length === 0) {
        throw new SieError('Se requiere al menos una ruta.');
    }

    // Si hay múltiples argumentos, unirlos con path.join
    const rutaCompleta = rutasSegmentos.length > 1
        ? path.join(...rutasSegmentos)
        : rutasSegmentos[0];

    // Validar path traversal
    if (rutaCompleta.includes('..')) {
        throw new SieError(`Ruta inválida (path traversal detectado): ${rutaCompleta}`);
    }

    // Verificar existencia física
    if (!fs.existsSync(rutaCompleta)) {
        throw new SieError(`La ruta del archivo o carpeta no existe: ${rutaCompleta}`);
    }

    return rutaCompleta;
};

/**
 * Obtiene el mapeo completo de archivos y carpetas de una ruta (recursivo).
 * @param {string} rutaCompletaCarpeta - Ruta absoluta de la carpeta a mapear.
 * @returns {Array} - Árbol con la estructura de archivos y subcarpetas.
 */
const getArchivosMapeados = (rutaCompletaCarpeta) => {
    const resultados = [];
    if (!fs.existsSync(rutaCompletaCarpeta)) return resultados;

    const lista = fs.readdirSync(rutaCompletaCarpeta);
    lista.forEach(nombreArchivo => {
        const rutaCompleta = path.join(rutaCompletaCarpeta, nombreArchivo);
        const stats = fs.statSync(rutaCompleta);

        let item = {
            name: nombreArchivo,
            fecha: stats.mtime
        };

        if (stats && stats.isDirectory()) {
            item.type = 'folder';
            item.children = getArchivosMapeados(rutaCompleta);
        } else {
            const ext = path.extname(nombreArchivo).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
                item.type = 'img';
            } else if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'].includes(ext)) {
                item.type = 'doc';
            } else if (['.mp3', '.wav', '.ogg', '.m4a', '.wma'].includes(ext)) {
                item.type = 'audio';
            } else if (['.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv'].includes(ext)) {
                item.type = 'video';
            } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
                item.type = 'archive';
            } else {
                item.type = 'file';
            }

            item.tamano = (stats.size / 1024).toFixed(2) + ' KB';
        }
        resultados.push(item);
    });

    return resultados;
};

/**
 * Valida que un nombre de archivo o carpeta no contenga caracteres peligrosos (path traversal).
 * @param {string} rutaParcial - Nombre del archivo o folder a validar (pude ser una ruta o solo el nombre).
 * @returns {string} - El mismo nombre si es válido.
 * @throws {SieError} - Si el nombre contiene caracteres peligrosos.
 */
const getRutaParcialValida = (rutaParcial) => {
    if (!rutaParcial) {
        throw new SieError("La ruta parcial del archivo o folder es requerida.");
    }

    // Validar path traversal (..) y rutas absolutas
    if (rutaParcial.includes('..') || path.isAbsolute(rutaParcial)) {
        throw new SieError("Ruta parcial del archivo o folder inválida.");
    }

    // Validar caracteres peligrosos en Windows/Linux: < > : " | ? * \ y caracteres de control
    // Nota: / (forward slash) está permitido para rutas de subcarpetas
    const caracteresProhibidos = /[<>:"|?*\\\x00-\x1f]/;
    if (caracteresProhibidos.test(rutaParcial)) {
        throw new SieError("El nombre contiene caracteres no permitidos.");
    }

    // Validar nombres reservados de Windows (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    const nombresReservados = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    const nombreSinExtension = path.parse(rutaParcial).name;
    if (nombresReservados.test(nombreSinExtension)) {
        throw new SieError("El nombre es una palabra reservada del sistema.");
    }

    return rutaParcial;
};

/**
 * Elimina un archivo o carpeta (con todo su contenido si es carpeta).
 * @param {string} rutaCompleta - Ruta completa del archivo o carpeta a eliminar.
 * @returns {object} - Objeto con success y message.
 * @throws {SieError} - Si ocurre un error durante la eliminación.
 */
const eliminarArchivosMapeados = (rutaCompleta) => {
    if (!fs.existsSync(rutaCompleta)) {
        throw new SieError(`La ruta no existe: ${rutaCompleta}`);
    }

    try {
        const stats = fs.statSync(rutaCompleta);

        if (stats.isDirectory()) {
            // Para carpetas, usamos rmSync (Node 14.14+) o rmdirSync (anterior) con recursive
            if (fs.rmSync) {
                fs.rmSync(rutaCompleta, { recursive: true, force: true });
            } else {
                fs.rmdirSync(rutaCompleta, { recursive: true });
            }
            return { success: true, message: `Carpeta eliminada correctamente.` };
        } else {
            fs.unlinkSync(rutaCompleta);
            return { success: true, message: `Archivo eliminado correctamente.` };
        }
    } catch (err) {
        throw new SieError(`Error al eliminar: ${err.message}`);
    }
};

/**
 * Maneja la subida de archivos usando Busboy con validaciones, sanitización y auto-renombrado.
 * Esta función procesa archivos multipart/form-data de forma segura y eficiente.
 * 
 * @param {object} options - Opciones de configuración
 * @param {object} options.req - Request de Express (debe contener headers)
 * @param {object} options.res - Response de Express (para enviar la respuesta)
 * @param {string} options.folderPath - Ruta absoluta donde se guardarán los archivos
 * @param {boolean} [options.autoCreateFolder=true] - Si true, crea la carpeta automáticamente si no existe
 * @param {number} [options.maxFiles=30] - Máximo número de archivos permitidos por petición
 * @param {number} [options.maxRenameAttempts=50] - Máximo de intentos para renombrar archivos duplicados
 * @param {string[]} [options.extensionesProhibidas] - Array de extensiones prohibidas (sin punto)
 * @returns {Promise<void>} - Promesa que se resuelve cuando termina el procesamiento
 * 
 * @example
 * await subirArchivosMultipart({
 *   req,
 *   res,
 *   folderPath: '/ruta/absoluta/destino',
 *   autoCreateFolder: true,
 *   maxFiles: 20,
 *   extensionesProhibidas: ['exe', 'dll', 'bat']
 * })
 */
const subirArchivosMultipart = (options) => {
    const {
        req,
        res,
        folderPath,
        autoCreateFolder = true,
        maxFiles = 30,
        maxRenameAttempts = 50,
        extensionesProhibidas = ['exe', 'dll', 'com', 'bat', 'cmd', 'msi', 'scr', 'lnk', 'sh', 'bash', 'ps1', 'vbs', 'vbe', 'jar', 'php', 'phtml', 'jsp', 'aspx', 'cgi', 'pl', 'htaccess', 'reg', 'ini', 'js', 'db']
    } = options;

    // Validaciones iniciales
    if (!req || !res) {
        throw new SieError('Se requieren los objetos req y res');
    }
    if (!folderPath) {
        throw new SieError('Se requiere la ruta de destino (folderPath)');
    }

    // Validar/crear la carpeta destino
    if (!fs.existsSync(folderPath)) {
        if (autoCreateFolder) {
            // Crear la carpeta automáticamente (recursivo)
            try {
                fs.mkdirSync(folderPath, { recursive: true });
            } catch (err) {
                throw new SieError(`No se pudo crear la carpeta destino: ${folderPath}. Error: ${err.message}`);
            }
        } else {
            // Si no se permite auto-creación, lanzar error
            throw new SieError(`La carpeta destino no existe: ${folderPath}. Debe crearla antes de subir archivos.`);
        }
    } else {
        // Si existe, validar que sea realmente una carpeta
        const stats = fs.statSync(folderPath);
        if (!stats.isDirectory()) {
            throw new SieError(`La ruta especificada no es una carpeta: ${folderPath}`);
        }
    }

    // --- INICIALIZACIÓN DE BUSBOY Y VARIABLES DE CONTROL ---
    const busboy = Busboy({
        headers: req.headers,
        defCharset: 'utf8',
        defParamCharset: 'utf8'
    });

    const archivosSubidos = [];
    const archivosRechazados = [];
    const promesas = [];
    let fileCount = 0;

    // Usamos una Promesa principal para sincronizar con LoopBack y evitar el error "Headers already sent"
    return new Promise((resolveMain) => {

        // EVENTO: Recepción de cada archivo individual
        busboy.on('file', (fieldname, file, info) => {
            const { filename } = info;
            fileCount++;

            // 0. LÍMITE DE ARCHIVOS: Rechazar si excede el máximo permitido
            if (fileCount > maxFiles) {
                archivosRechazados.push({
                    name: filename,
                    reason: `Límite de ${maxFiles} archivos excedido`
                });
                file.resume(); // Vaciar buffer
                return;
            }

            const nombreBase = path.basename(filename);
            const ext = path.extname(nombreBase).toLowerCase().replace('.', '');

            // 1. FILTRADO SILENCIOSO: Si la extensión es prohibida, se ignora por completo
            if (extensionesProhibidas.includes(ext)) {
                archivosRechazados.push({
                    name: filename,
                    reason: `Extensión .${ext} no permitida`
                });
                file.resume(); // Vaciar el buffer del archivo para pasar al siguiente
                return;
            }

            // 2. SANITIZACIÓN: Limpiar caracteres ilegales en el nombre
            const nombreLimpio = nombreBase.replace(/[\\/:*?"<>|]/g, '_').trim();

            let finalName = nombreLimpio;
            let filePath = path.normalize(path.join(folderPath, finalName));

            // 3. AUTO-RENOMBRADO: Agregar (2), (3), etc. si el archivo ya existe
            let counter = 1;
            while (fs.existsSync(filePath)) {
                counter++;
                const currentExt = path.extname(nombreLimpio);
                const currentBase = path.basename(nombreLimpio, currentExt);
                finalName = `${currentBase} (${counter})${currentExt}`;
                filePath = path.normalize(path.join(folderPath, finalName));
                if (counter > maxRenameAttempts) break; // Límite de seguridad
            }

            // 4. ESCRITURA FÍSICA: Stream de datos hacia el disco
            const writeStream = fs.createWriteStream(filePath);
            file.pipe(writeStream);

            // Encapsulamos cada escritura en una promesa para esperar a que todas terminen al final
            const promesa = new Promise((resolve, reject) => {
                writeStream.on('finish', () => {
                    archivosSubidos.push({
                        name: filename,
                        serverName: finalName,
                        wasRenamed: counter > 1
                    });
                    resolve();
                });
                writeStream.on('error', (err) => {
                    reject(new Error(`Error al guardar '${filename}': ${err.message}`));
                });
            });
            promesas.push(promesa);
        });

        // EVENTO: Cuando Busboy termina de leer todos los datos del request
        busboy.on('finish', async () => {
            try {
                // Esperamos a que terminen todas las acciones de guardado de los archivos válidos
                const resultados = await Promise.allSettled(promesas);
                const erroresEscritura = resultados
                    .filter(r => r.status === 'rejected')
                    .map(r => r.reason.message);

                // RESPUESTA FINAL: Enviamos éxito o error técnico si falló la escritura
                if (archivosSubidos.length === 0 && erroresEscritura.length > 0) {
                    res.status(500).json({
                        success: false,
                        message: 'No se pudieron guardar los archivos',
                        errors: erroresEscritura
                    });
                } else {
                    res.json({
                        success: true,
                        files: archivosSubidos,
                        rejected: archivosRechazados.length > 0 ? archivosRechazados : undefined,
                        errors: erroresEscritura.length > 0 ? erroresEscritura : undefined
                    });
                }
            } catch (err) {
                console.error('[SIE] Error crítico finalizando subida:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error interno en el servidor' });
                }
            } finally {
                resolveMain(); // Notificar a LoopBack que la función asíncrona terminó realmente
            }
        });

        // EVENTO: Control de errores de red o interrupción del flujo
        busboy.on('error', (err) => {
            console.error('[SIE] Error en flujo busboy:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error en la transferencia de archivos' });
            }
            resolveMain();
        });

        // Iniciar el procesamiento del stream de la petición
        req.pipe(busboy);
    });
};

/**
 * Codifica texto según RFC5987 para usar en headers HTTP (ej: Content-Disposition)
 * Útil para nombres de archivos en descargas HTTP que contengan caracteres especiales
 * @param {string} texto - Texto a codificar (usualmente el nombre del archivo)
 * @returns {string} Texto codificado según RFC5987
 */
const codificarNombreArchivoHttp = (texto) => {
    if (texto == null || typeof texto !== 'string') {
        return '';
    }

    return encodeURIComponent(texto)
        // RFC5987 requiere que estos caracteres estén codificados
        .replace(/[*'()]/g, (char) => {
            return '%' + char.charCodeAt(0).toString(16).toUpperCase();
        })
        // RFC5987 permite estos caracteres sin codificar para mejor legibilidad
        // aunque RFC3986 los reserve: | (pipe), ` (backtick), ^ (caret)
        .replace(/%(?:7C|60|5E)/gi, (match) => {
            return String.fromCharCode(parseInt(match.slice(1), 16));
        });
};

module.exports = {
    getRutaProyecto,
    getColegio,
    getArchivosMapeados,
    getRutaParcialValida,
    eliminarArchivosMapeados,
    subirArchivosMultipart,
    codificarNombreArchivoHttp,
    crearCarpetaSiNoExiste,
    verificarExistencia,
};
