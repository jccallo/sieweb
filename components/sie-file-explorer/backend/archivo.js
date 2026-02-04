const Crypto = require('../../classes/Crypto')
const Busboy = require('busboy')
const $crypto = new Crypto()
const path = require('path')
const fs = require('fs')
const SieError = require('../../server/utils/sieError')
const fn = require('../../server/utils/functions');

// const { standardText } = require('../../server/utils/string.js')

const CONFIG_ARCHIVO = {
    'tmp': {
        root: false,
        url: 'tmp' // requerido
    },
    'zend': {
        root: true,
        url: '' // requerido
    },
    'publico': {
        root: true,
        cloud: true,
        url: 'publico'
    }
}

/**
 * Crea una carpeta a partir de un directorio
 * @param {string} carpeta - Url de la carpeta a crear
 * @param {boolean} [root=false] - No es requerido
 * @returns {boolean} - Sólo retorna true si se crea uno nuevo
 */
const mkdirSync = (carpeta, root) => {
    const indicesCarpeta = carpeta.split('\\')
    let estadoCreacion = false
    if (carpeta && typeof carpeta === 'string') {
        if (root) {
            carpeta = path.resolve(root, carpeta)
        }
        try {
            if (!fs.existsSync(path.resolve(root, indicesCarpeta[0]))) {
                fs.mkdirSync(path.resolve(root, indicesCarpeta[0]))
            }
            if (!fs.existsSync(path.resolve(root, `${indicesCarpeta[0]}/${indicesCarpeta[1]}`))) {
                fs.mkdirSync(path.resolve(root, `${indicesCarpeta[0]}/${indicesCarpeta[1]}`))
            }
            fs.mkdirSync(carpeta)
            estadoCreacion = true
        } catch (e) {
            if (e && e.code === 'EEXIST') {
                // if (process.env.NODE_ENV === 'development') { }
            } else {
                console.error(`No se puede crear la carpeta: ${carpeta}`)
            }
        }
    }
    return estadoCreacion
}


/**
 * Crea una carpeta recursivamente (equivalente a 'mkdir -p').
 * @param {string} carpeta - La ruta de la carpeta a crear.
 * @param {string} [root] - Una ruta base opcional.
 * @returns {boolean} - true si se creó (o ya existía), false si hubo un error.
 */
const mkdirSync24 = (carpeta, root) => {
    if (!carpeta || typeof carpeta !== 'string') {
        return false;
    }

    // 1. Resuelve la ruta completa (igual que en tu función original)
    const fullPath = root ? path.resolve(root, carpeta) : path.resolve(carpeta);

    try {
        // 2. Llama a mkdirSync con la opción recursiva
        // Esto reemplaza toda tu lógica de split() y múltiples llamadas.
        fs.mkdirSync(fullPath, { recursive: true });

        // Si llega aquí, la operación fue exitosa (la carpeta se creó o ya existía)
        return true;

    } catch (e) {
        // Con { recursive: true }, el error EEXIST nunca ocurre.
        // Esto solo capturará errores reales (ej. falta de permisos 'EACCES').
        console.error(`Error inesperado al crear la carpeta: ${fullPath}`, e);
        return false;
    }
}


// const mkdirpSync = (ruta, root) => {
//     let estadoFinal = false
//     if (ruta && typeof ruta === 'string') {
//         const arrCarpetas = ruta.split(path.sep)
//         for (let i = 1; i <= arrCarpetas.length; i++) {
//             const rutaCarpeta = arrCarpetas.slice(0, i).join(path.sep)
//             const estadoCreacion = mkdirSync(rutaCarpeta, root)
//             if (estadoCreacion || i === arrCarpetas.length) {
//                 estadoFinal = estadoCreacion
//             }
//         }
//     }
//     return estadoFinal
// }

module.exports = function (Archivos) {
    Archivos.beforeRemote('upload', function (context, unused, next) {
        var mkdirp = require('mkdirp')
        var x = context.req.originalUrl
        var inicio = x.lastIndexOf('HyoArchivo/') + 11
        var fin = x.lastIndexOf('/upload')
        var container = x.substring(inicio, fin)
        var token = context.req.usu
        var dir = './archivos/' + token.COLEGIO + '/' + token.ANO + '/' + container
        var promesa = new Promise(function (resolve, reject) {
            mkdirp(dir, function (err) {
                if (err) {
                    reject(err)
                }
                resolve('ok')
            })
        })
        promesa.then(() => {
            this.dataSource.connector.dataSource.connector.getFilename = function (file, req) {
                //file.originalFilename = standardText(file.originalFilename)
                var origFilename = file.name;
                var parts = origFilename.split('.'),
                    extension = parts[parts.length - 1];
                var fechaFinal = new Date()
                fechaFinal.setHours(fechaFinal.getHours() + 1)
                var usucod = ""
                if (req.usu.USUCOD)
                    usucod = req.usu.USUCOD
                else
                    usucod = req.usu.FAMCOD
                const cryptoRnd = $crypto.random(8)
                const fecEnd = fechaFinal.getTime()
                var newFilename = `${fecEnd}_${cryptoRnd}_${usucod}.${extension}`
                return newFilename;
            }
            next();
        })
    });

    // class NodeCanvasFactory {
    //     create(width, height) {
    //         const Canvas = require('pureimage')
    //         const canvas = Canvas.make(width, height)
    //         const context = canvas.getContext('2d')
    //         if (!context.canvas) {
    //             context.canvas = {
    //                 width, height
    //             }
    //         }
    //         return { canvas, context }
    //     }
    //     reset(canvasAndContext, width, height) {
    //         canvasAndContext.canvas.width = width
    //         canvasAndContext.canvas.height = height
    //     }
    //     destroy(canvasAndContext) {
    //         canvasAndContext.canvas.width = 0
    //         canvasAndContext.canvas.height = 0
    //         canvasAndContext.canvas = null
    //         canvasAndContext.context = null
    //     }
    // }

    Archivos.afterRemote('upload', function (ctx, unused, next) {
        const container = 'horario'
        if (ctx.req.params && ctx.req.params.container === container) {
            /* const file = ctx.result && ctx.result.result.files && ctx.result.result.files.file[0]
            if (file && file.type === 'application/pdf') {
                const token = ctx.req.usu
                const dir = './archivos/' + token.COLEGIO + '/' + token.ANO + '/' + container + '/' + file.name
                const pdfjs = require('pdfjs-dist')
                pdfjs.getDocument(dir).promise.then(pdf => {
                    if (pdf && pdf.numPages > 0) {
                        return pdf.getPage(1)
                    } else {
                        return Promise.reject(new SieError('No tiene páginas'))
                    }
                }).then(page => {
                    const fs = require('fs')
                    const viewport = page.getViewport(1)
                    const canvasFactory = new NodeCanvasFactory()
                    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)

                    const renderContext = {
                        canvasContext: canvasAndContext.context,
                        viewport: viewport,
                        canvasFactory
                    }
                    return page.render(renderContext).then(() => {
                        return Canvas.encodeJPEGToStream(img, fs.createWriteStream(dir.replace(/\.pdf$/i, 'jpg')))
                    })
                }).then(() => {
                    next()
                }).catch(e => {
                    console.error('Error pdf', e)
                })
            } else {
                next()
            } */
            next()
        } else {
            if (ctx.req.headers.referer && ['mensajeria', 'contenidoDetalle', 'mobil'].find(v => ctx.req.headers.referer.includes(v)) !== undefined) {
                const maximo = 20
                const size = ctx.result.result.files.file[0].size
                const tamanoMB = size / (1024 * 1024)
                if (tamanoMB >= maximo) {
                    next(new SieError('no puedes subir archivo mayores a 20MB'))
                    return
                }
            }
            next()
        }
    })

    Archivos.getRaiz = function () {
        return path.resolve(__dirname, '../..', 'archivos')
    }

    Archivos.getConfig = function (repositorio) {
        const name = String(repositorio).toLowerCase()
        const config = CONFIG_ARCHIVO[name]
        if (config === undefined) {
            throw new SieError(`No se puede subir el archivo al repositorio ${repositorio}`)
        }
        // config.url debe ser requerido
        /* if (!config.url) {
            config.url = name
        } */
        return { config, name }
    }

    Archivos.getRepositorio = async function ({ token, repositorio, colegio }) {
        if (!colegio) {
            colegio = token.COLEGIO
        }

        const rutaRaiz = path.resolve(Archivos.getRaiz(), colegio)
        const { config, name } = Archivos.getConfig(repositorio)

        if (config.root) {
            return {
                name,
                config,
                folderpath: config.url,
                fullpath: path.resolve(rutaRaiz, config.url)
            }
        }

        // Se le agrega el AÑO
        if (!token) {
            throw new SieError(`Necesita autenticarse para entrar al repositorio ${repositorio}`)
        }

        let anoActual = new Date().getFullYear()
        if (token.ANO) {
            anoActual = token.ANO
        }

        const pathDir = path.join(String(anoActual), config.url)

        // return path.resolve(rutaRaiz, String(anoActual), config.url)
        return {
            name,
            config,
            folderpath: pathDir, // cloud directory
            fullpath: path.resolve(rutaRaiz, pathDir) // local directory
        }
    }

    Archivos.subir = function (repositorio = 'tmp', req, res, cb) {
        const rutaRaiz = Archivos.getRaiz()
        const token = Archivos.app.getToken()
        const fechaActual = Date.now()
        const extensiones = ['dll', 'bat', 'exe', 'reg', 'php', 'phtml', 'js'] // Minúsculas
        const colInfo = Archivos.app.getColInfo()
        const accept = {
            'image/png': '.png',
            'image/jpeg': '.jpeg',
            'image/svg+xml': '.svg',
            'video/mpeg': '.mpeg',
            'application/pdf': '.pdf'
        }

        Archivos.getRepositorio({ token, repositorio }).then(({ fullpath, config, folderpath }) => {
            const busboy = Busboy({ headers: req.headers })
            const respuesta = {}
            busboy.on('file', function (fieldname, file, info) {
                const { filename, mimeType } = info;
                let extension = path.extname(filename)
                respuesta.nameOrigin = filename
                //respuesta.nameOrigin = standardText(filename)
                if (extensiones.indexOf(String(extension).toLowerCase()) >= 0) {
                    cb({
                        message: `No se pueden subir archivos con la extension ${extension}`
                    })
                    return Archivos.app.logError('')
                }
                // Si no tiene extensión, se identifica por mimetypes conocidos
                if (!extension && accept[mimeType]) {
                    extension = accept[mimeType]
                }
                const cryptoRnd = $crypto.random(8)
                respuesta.name = $crypto.onlyEncrypt(`${fechaActual}_${cryptoRnd}_${token.USUCOD}`) + extension
                respuesta.size = 0
                if (colInfo && colInfo.url && typeof req.originalUrl === 'string') {
                    respuesta.url = colInfo.url + '/' + (process.env.PROXY_NODE || 'lms') + req.originalUrl.replace('subir', 'bajar') + '/' + respuesta.name
                }
                if (repositorio === 'zend') {
                    const tempPath = path.resolve(fullpath, token.RUTA)
                    const tempNameFile = path.basename(tempPath)
                    fullpath = path.dirname(tempPath)
                    respuesta.name = tempNameFile
                }
                const rutaArchivo = path.resolve(fullpath, respuesta.name)
                mkdirSync24(path.relative(rutaRaiz, fullpath), rutaRaiz)
                file.on('data', (data) => {
                    respuesta.size += data.length
                })
                respuesta.rutaArchivo = rutaArchivo
                const writer = fs.createWriteStream(rutaArchivo)
                writer.on('finish', async () => {
                    try {
                        if (config.cloud) {
                            await Archivos.app.models.storage.uploadFileStaticS3Async({
                                token,
                                file: path.join(folderpath, respuesta.name),
                            })
                        }
                        res.json(respuesta)
                    } catch (e) {
                        Archivos.app.logError(e)
                        res.status(422).json({ message: `Error al subir el archivo ${respuesta.nameOrigin}` })
                    }
                })
                file.pipe(writer)
            })
            //busboy.on('finish', async () => {
            //})
            req.pipe(busboy)
        }).catch(e => {
            cb({
                message: e.message
            })
            Archivos.app.logError(e)
        })
    }

    Archivos.remoteMethod('subir', {
        description: 'Uploads a file',
        accepts: [
            { arg: 'repositorio', type: 'string' }, //En multipart/form-data esto no funciona como parámetro de post
            { arg: 'req', type: 'object', http: { source: 'req' } },
            { arg: 'res', type: 'object', http: { source: 'res' } }
        ],
        returns: {
            arg: 'json'
        },
        http: {
            verb: 'post',
            path: '/subir/:repositorio?'
        }
    });

    Archivos.bajar = function (repositorio, archivo, req, res, cb) {
        const { token } = Archivos.app.getAll()
        const COLCOD = Archivos.app.getColCod()
        Archivos.getRepositorio({
            token,
            colegio: req.cole,
            repositorio
        }).then(({ config, folderpath, fullpath }) => {
            let archivoFinal = ''
            try {
                archivoFinal = $crypto.decrypt(archivo)
            } catch (e) {
                archivoFinal = String(archivo)
            }
            if (config.cloud && Archivos.app.models.storage.isActiveS3Async({ COLCOD, COLEGIO: req.cole })) {
                const etag = $crypto.encrypt(String(archivo), true)
                if (Archivos.app.isCached(res, req, etag)) {
                    return;
                }
                Archivos.app.models.storage.downloadFileS3Async({
                    token: { COLCOD, COLEGIO: req.cole },
                    file: path.join(folderpath, archivoFinal),
                    etag,
                    response: res
                })
            } else {
                res.sendFile(path.resolve(fullpath, archivoFinal), function (e) {
                    if (e) {
                        cb({ message: 'No existe el archivo' })
                        Archivos.app.logError(e)
                    }
                })
            }
        }).catch(e => {
            cb({
                message: e.message
            })
            Archivos.app.logError(e)
        })
    }

    Archivos.remoteMethod('bajar', {
        description: 'Download a file',
        accepts: [
            { arg: 'repositorio', type: 'string', required: true },
            { arg: 'archivo', type: 'string', required: true },
            { arg: 'req', type: 'object', http: { source: 'req' } },
            { arg: 'res', type: 'object', http: { source: 'res' } }
        ],
        returns: {
            arg: 'json'
        },
        http: {
            verb: 'get',
            path: '/bajar/:repositorio/:archivo'
        }
    })
    Archivos.verTemporal = function (container, name, resp, cb) {
        const { token } = Archivos.app.getAll()
        const lanzarError = function (e) {
            return cb({ status: 202, message: e.message || 'e0001' })
        }
        const url = Archivos.app.get('rootJS') + 'archivos/' + token.COLEGIO + '/' + token.ANO + '/' + container + '/' + name

        return Archivos.app.fileExist(url).then(r => {
            resp.sendFile(r, {
                headers: {
                    'Vary': 'Accept-Encoding,User-Agent',
                    'Content-Disposition': `attachment; filename*=UTF-8''${Archivos.app.encodeURI(name)}`
                }
            })
        }).catch(() => {
            return lanzarError(new SieError('Error Lectura en el Sistema'))
        })
    }
    Archivos.remoteMethod('verTemporal', {
        isStatic: true,
        accepts: [
            { arg: 'container', type: 'string' },
            { arg: 'name', type: 'string' },
            { arg: 'resp', type: 'object', 'http': { source: 'res' } }
        ],
        returns: [
            { arg: 'body', type: 'file', root: true },
            { arg: 'Content-Type', type: 'string', http: { target: 'header' } }
        ],
        http: { verb: 'get', path: '/descargar/:container/:name' }
    })

    Archivos.descargarArchivo = async function (id, tabla, campo, pk, response) {
        const { knex, token } = this.app.getAll()
        try {
            const [{ ADJUNTO, TIPO, NOMBRE }] = await knex(tabla).select(`${campo} as ADJUNTO`, 'TIPO', 'NOMBRE').where(pk, id)
            if (ADJUNTO) {
                if (TIPO === 'N') {
                    return this.app.models.storage.downloadFileS3Async({ file: ADJUNTO, name: NOMBRE, response, token })
                } else {
                    let dir = this.app.get('rootJS') + 'archivos/' + token.COLEGIO + '/' + ADJUNTO
                    if (String(ADJUNTO).toLowerCase().indexOf('documentos') === 0) {
                        dir = process.env.PROYECTOZEND + "html/" + ((process.env.COLEGIO_SIEWEB) ? process.env.COLEGIO_SIEWEB : token.COLEGIO) + "/" + ADJUNTO
                    }
                    const fileExist = this.app.fileExist(dir).then(url => ({ url, name: NOMBRE || 'agenda_personal' }))
                    return fileExist.then(({ url, name }) => {
                        response.sendFile(url, {
                            headers: {
                                'Vary': 'Accept-Encoding,User-Agent',
                                'Content-Disposition': `inline; filename*=UTF-8''${this.app.encodeURI(name)}`
                            }
                        })
                        return true
                    })
                }
            } else {
                return Promise.reject(new SieError('No hay adjuntos'))
            }
        } catch (e) {
            Archivos.app.logError(e)
        }
    }
    Archivos.remoteMethod('descargarArchivo', {
        isStatic: true,
        accepts: [
            { arg: 'id', type: 'string', required: true },
            { arg: 'tabla', type: 'string', required: true },
            { arg: 'campo', type: 'string', required: true },
            { arg: 'pk', type: 'string', required: true },
            { arg: 'response', type: 'object', http: { source: 'res' } }
        ],
        returns: [
            { arg: 'body', type: 'file', root: true },
            { arg: 'Content-Type', type: 'string', http: { target: 'header' } }
        ],
        http: { verb: 'get', path: '/archivo/:id/:tabla/:campo/:pk?' }
    })

    /**
     * Lista archivos y carpetas de forma recursiva en una ruta específica del proyecto.
     * @param {string} project - Tipo de proyecto: 'node' o 'php' (opcional, default 'node')
     * @param {string} folder - Subcarpeta dentro del colegio (opcional, default 'imagenes')
     * @returns {Array} - Árbol con la estructura de archivos y carpetas
     */
    Archivos.listarArchivosRuta = async function (project = 'node', folder = 'imagenes') {
        const rutaProyecto = fn.getRutaProyecto(project)
        const folderBase = project === 'php' ? 'html' : 'archivos'
        const nombreColegio = fn.getColegio().nombre
        const folderArchivos = fn.getRutaParcialValida(folder)
        const dirPath = path.join(rutaProyecto, folderBase, nombreColegio, folderArchivos)

        return fn.getArchivosMapeados(dirPath)
    }

    Archivos.remoteMethod('listarArchivosRuta', {
        accepts: [
            { arg: 'project', type: 'string', required: false },
            { arg: 'folder', type: 'string', required: false }
        ],
        returns: { arg: 'data', type: 'array', root: true },
        http: { verb: 'get', path: '/listar-archivos-ruta' }
    })

    /**
     * Elimina un archivo físicamente del servidor
     * @param {string} project - 'node' o 'php' (opcional, default 'node')
     * @param {string} folder - Subcarpeta donde se encuentra el archivo (opcional, default 'imagenes')
     * @param {string} filename - Nombre del archivo a eliminar (requerido)
     */
    Archivos.eliminarArchivoRuta = async function (project = 'node', folder = 'imagenes', filename) {
        const rutaProyecto = fn.getRutaProyecto(project)
        const folderBase = project === 'php' ? 'html' : 'archivos'
        const nombreColegio = fn.getColegio().nombre
        const folderArchivos = fn.getRutaParcialValida(folder)
        const filenameValido = fn.getRutaParcialValida(filename)
        const filePath = path.join(rutaProyecto, folderBase, nombreColegio, folderArchivos, filenameValido)

        return fn.eliminarArchivosMapeados(filePath)
    }

    Archivos.remoteMethod('eliminarArchivoRuta', {
        accepts: [
            { arg: 'project', type: 'string', required: false },
            { arg: 'folder', type: 'string', required: false },
            { arg: 'filename', type: 'string', required: true }
        ],
        returns: { arg: 'data', type: 'object', root: true },
        http: { verb: 'delete', path: '/eliminar-archivo-ruta' }
    })

    /**
     * Sube uno o más archivos a una ruta específica del servidor
     * @param {string} project - 'node' o 'php' (opcional, default 'node')
     * @param {string} folder - Subcarpeta base (opcional, default 'imagenes')
     * @param {string} subfolder - Ruta interna dentro de la carpeta base (opcional)
     * @param {object} req - Request de Express
     * @param {object} res - Response de Express
     */
    Archivos.subirArchivoRuta = async function (project = 'node', folder = 'imagenes', subfolder, req, res) {
        const rutaProyecto = fn.getRutaProyecto(project)
        const folderBase = project === 'php' ? 'html' : 'archivos'
        const nombreColegio = fn.getColegio().nombre
        const folderArchivos = fn.getRutaParcialValida(folder)
        const subFolderFinal = subfolder ? fn.getRutaParcialValida(subfolder) : ''
        const folderPath = path.join(rutaProyecto, folderBase, nombreColegio, folderArchivos, subFolderFinal)

        return fn.subirArchivosMultipart({ req, res, folderPath })
    }

    Archivos.remoteMethod('subirArchivoRuta', {
        accepts: [
            { arg: 'project', type: 'string', required: false },
            { arg: 'folder', type: 'string', required: false },
            { arg: 'subfolder', type: 'string', required: false },
            { arg: 'req', type: 'object', http: { source: 'req' } },
            { arg: 'res', type: 'object', http: { source: 'res' } }
        ],
        returns: { arg: 'data', type: 'object', root: true },
        http: { verb: 'post', path: '/subir-archivo-ruta' }
    })

    /**
     * Sirve un archivo para su visualización o descarga
     * @param {string} project - 'node' o 'php'
     * @param {string} folder - Carpeta base
     * @param {string} filename - Ruta relativa del archivo
     */
    Archivos.verArchivoRuta = async function (project = 'node', folder = 'imagenes', filename, res) {
        const rutaProyecto = fn.getRutaProyecto(project)
        const folderBase = project === 'php' ? 'html' : 'archivos'
        const nombreColegio = fn.getColegio().nombre
        const folderArchivos = fn.getRutaParcialValida(folder)
        const filenameValido = fn.getRutaParcialValida(filename)
        const filePath = fn.verificarExistencia(rutaProyecto, folderBase, nombreColegio, folderArchivos, filenameValido)
        const nombreCodificado = fn.codificarNombreArchivoHttp(path.basename(filePath)) 

        // Agregamos las cabeceras necesarias para que el navegador lo muestre inline
        res.sendFile(filePath, {
            headers: {
                'Vary': 'Accept-Encoding,User-Agent',
                'Content-Disposition': `inline; filename*=UTF-8''${nombreCodificado}`
            }
        })
    }

    Archivos.remoteMethod('verArchivoRuta', {
        accepts: [
            { arg: 'project', type: 'string', required: false },
            { arg: 'folder', type: 'string', required: false },
            { arg: 'filename', type: 'string', required: true },
            { arg: 'res', type: 'object', http: { source: 'res' } }
        ],
        returns: { arg: 'body', type: 'file', root: true },
        http: { verb: 'get', path: '/ver-archivo-ruta' }
    })

    /**
     * Crea una nueva carpeta en la ruta especificada
     * @param {string} project - 'node' o 'php'
     * @param {string} folder - Carpeta base
     * @param {string} subfolder - Ruta interna donde se creará la carpeta (opcional)
     * @param {string} newFolderName - Nombre de la nueva carpeta
     */
    Archivos.crearCarpetaRuta = async function (project = 'node', folder = 'imagenes', subfolder, newFolderName) {
        const rutaProyecto = fn.getRutaProyecto(project)
        const folderBase = project === 'php' ? 'html' : 'archivos'
        const nombreColegio = fn.getColegio().nombre
        const folderArchivos = fn.getRutaParcialValida(folder)
        const subFolderFinal = subfolder ? fn.getRutaParcialValida(subfolder) : ''
        const newFolderValido = fn.getRutaParcialValida(newFolderName)
        
        const folderPath = path.join(rutaProyecto, folderBase, nombreColegio, folderArchivos, subFolderFinal, newFolderValido)
        
        fn.crearCarpetaSiNoExiste(folderPath)
        return { success: true, message: 'Carpeta creada correctamente' }
    }

    Archivos.remoteMethod('crearCarpetaRuta', {
        accepts: [
            { arg: 'project', type: 'string', required: false },
            { arg: 'folder', type: 'string', required: false },
            { arg: 'subfolder', type: 'string', required: false },
            { arg: 'newFolderName', type: 'string', required: true }
        ],
        returns: { arg: 'data', type: 'object', root: true },
        http: { verb: 'post', path: '/crear-carpeta-ruta' }
    })
}
