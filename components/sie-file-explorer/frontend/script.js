import { QCard, QToolbar } from "quasar"
import SieFileBreadcrumbs from './Breadcrumbs.vue'
import SieFileToolbar from './Toolbar.vue'
import SieFileList from './FileTable.vue'
import notify from 'utils/notify'

export default {
  name: 'SieFileExplorer',
  components: {
    QCard,
    QToolbar,
    SieFileBreadcrumbs,
    SieFileToolbar,
    SieFileList
  },
  data () {
    return {
      treeInfo: [],
      hasError: false,
      rutaActual: [],
      columnasArchivos: [
        { name: 'icon', label: '', align: 'center', field: 'type' },
        { name: 'name', label: 'Nombre', align: 'left', field: 'name', sortable: true, sort: this.sortByName },
        { name: 'fecha', label: 'Fecha Modificación', align: 'left', field: 'fecha', sortable: true },
        { name: 'tamano', label: 'Tamaño', align: 'left', field: 'tamano', sortable: true, sort: this.sortBySize },
        { name: 'actions', label: 'Acciones', align: 'center' }
      ]
    }
  },
  props: {
    project: {
      type: String,
      default: null
    },
    folder: {
      type: String,
      default: null
    },
    /** Habilitar creación de carpetas */
    canCreateFolder: {
      type: Boolean,
      default: false
    },
    /** Habilitar subida de archivos */
    canUpload: {
      type: Boolean,
      default: true
    },
    /** Habilitar eliminación de archivos/carpetas */
    canDelete: {
      type: Boolean,
      default: true
    },
    /** Registros por página (0 para mostrar todos) */
    rowsPerPage: {
      type: Number,
      default: 15
    },
    /** Tamaño máximo por archivo en MB */
    maxFileSize: {
      type: Number,
      default: 20
    }
  },
  computed: {
    listaArchivos () {
        if (!this.treeInfo || !Array.isArray(this.treeInfo)) {
          console.warn('[SIE] treeInfo no es un arreglo válido:', this.treeInfo)
          return []
        }
        
        let currentLevel = this.treeInfo
        for (const folderName of this.rutaActual) {
            const folder = currentLevel.find(f => f.name === folderName && f.type === 'folder')
            if (folder && Array.isArray(folder.children)) {
                currentLevel = folder.children
            } else {
                return []
            }
        }
        return currentLevel
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    /** Solicita confirmación para eliminar un archivo */
    eliminarArchivo (archivo) {
      this.$q.dialog({
        title: 'Confirmar',
        message: '¿Estás seguro de eliminar ' + archivo.name + '?',
        cancel: { label: 'Cancelar', flat: true },
        ok: { label: 'Eliminar', flat: true },
        persistent: true
      }).onOk(() => this.procesarEliminacion(archivo))
    },
    /** Ejecuta la eliminación del archivo en el servidor */
    async procesarEliminacion (archivo) {
        try {
          const rutaRelativa = [...this.rutaActual, archivo.name].join('/')

          await this.$http.delete('api/HyoArchivo/eliminar-archivo-ruta', {
            params: {
              project: this.project || undefined,
              folder: this.folder || undefined,
              filename: rutaRelativa
            }
          })

          notify('Archivo eliminado correctamente', 'positive')
          this.init()
        } catch (e) {
          console.error('[SIE] Error al eliminar:', e)
          notify('Error al eliminar el archivo: ' + (e.message || 'Error desconocido'), 'warning')
        }
    },
    /** Abre una carpeta o previsualiza un archivo según el tipo */
    abrirCarpeta (row) {
      if (row.type === 'folder') {
         this.rutaActual.push(row.name) 
      } else {
         this.previsualizarArchivo(row)
      }
    },
    /** Orquesta la previsualización de archivos obteniendo su contenido y mostrándolo */
    async previsualizarArchivo (archivo) {
      const extension = archivo.name.split('.').pop().toLowerCase()
      const rutaRelativa = [...this.rutaActual, archivo.name].join('/')
      
      try {
        this.$q.loading.show({ message: 'Preparando vista previa...' })
        const blob = await this.obtenerBlobArchivo(rutaRelativa)
        const localUrl = URL.createObjectURL(blob)
        this.mostrarDialogoVistaPrevia(archivo, localUrl, extension)
      } catch (e) {
        console.error('[SIE] Error al obtener vista previa:', e)
        notify('No se pudo cargar la vista previa', 'warning')
      } finally {
        this.$q.loading.hide()
      }
    },
    /** Obtiene el contenido del archivo desde el servidor como Blob */
    async obtenerBlobArchivo (rutaRelativa) {
        const response = await this.$http.get('api/HyoArchivo/ver-archivo-ruta', {
          params: {
            project: this.project || 'node',
            folder: this.folder || 'imagenes',
            filename: rutaRelativa
          },
          responseType: 'blob'
        })
        const blobData = response.data || response
        return new Blob([blobData], { type: blobData.type || 'image/png' })
    },
    /** Muestra el diálogo con la vista previa del archivo */
    mostrarDialogoVistaPrevia (archivo, localUrl, extension) {
        const esImagen = ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(extension)
        const esPDF = extension === 'pdf'

        this.$q.dialog({
          title: archivo.name,
          ok: { label: 'Descargar', flat: true, color: 'primary' },
          cancel: { label: 'Cerrar', flat: true },
          style: 'width: 800px; max-width: 90vw',
          html: true,
          message: this.generarHtmlVistaPrevia(localUrl, esImagen, esPDF)
        }).onOk(() => {
          this.descargarArchivoLocal(localUrl, archivo.name)
        }).onDismiss(() => {
          URL.revokeObjectURL(localUrl)
        })
    },
    /** Genera el HTML para el diálogo de vista previa */
    generarHtmlVistaPrevia (url, esImagen, esPDF) {
        if (esImagen) return `<div style="text-align: center; margin-top: 10px"><img src="${url}" style="max-width: 100%; max-height: 70vh; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1)"></div>`
        if (esPDF) return `<div style="text-align: center; margin-top: 10px"><iframe src="${url}" width="100%" height="500px" style="border: none"></iframe></div>`
        return `
            <div style="text-align: center; margin-top: 10px">
                <div class="q-pa-lg text-grey-8">
                  <q-icon name="insert_drive_file" size="100px" color="grey-5" />
                  <div class="text-h6 q-mt-md">Vista previa no disponible</div>
                  <div class="text-body2">Este tipo de archivo debe descargarse para ser visualizado.</div>
                </div>
            </div>`
    },
    /** Descarga un archivo desde una URL local (blob) */
    descargarArchivoLocal (url, nombre) {
          const link = document.createElement('a')
          link.href = url
          link.download = nombre
          link.click()
    },
    /** Descarga un archivo directamente desde el servidor */
    async descargarArchivo (archivo) {
      try {
        this.$q.loading.show({ message: 'Descargando archivo...' })
        const rutaRelativa = [...this.rutaActual, archivo.name].join('/')
        const blob = await this.obtenerBlobArchivo(rutaRelativa)
        const localUrl = URL.createObjectURL(blob)
        this.descargarArchivoLocal(localUrl, archivo.name)
        URL.revokeObjectURL(localUrl)
      } catch (e) {
        console.error('[SIE] Error al descargar:', e)
        notify('No se pudo descargar el archivo', 'warning')
      } finally {
        this.$q.loading.hide()
      }
    },
    /** Retrocede un nivel en la navegación de carpetas */
    navegarAtras () {
      if (this.rutaActual.length > 0) {
        this.rutaActual.pop()
      }
    },
    /** Navega a una ruta específica del breadcrumb */
    navegarBreadcrumb (index) {
        this.rutaActual = this.rutaActual.slice(0, index + 1)
    },
    /** Activa el input oculto para seleccionar archivos */
    subirArchivoAccion () {
      this.$refs.fileInput.click()
    },
    async onFileSelected (event) {
      const files = event.target.files
      if (!files || files.length === 0) return

      try {
        this.validarArchivosSubida(files)
        await this.procesarSubida(files)
        this.init() 
      } catch (e) {
        console.error('[SIE] Error al subir:', e)
        const errorMsg = e.response && e.response.data && e.response.data.message 
          ? e.response.data.message 
          : (e.message || 'Error desconocido')
        notify(errorMsg, 'warning')
      } finally {
        this.$q.loading.hide()
        event.target.value = ''
      }
    },
    /** Valida el tamaño y extensión de los archivos a subir */
    validarArchivosSubida (files) {
      const extensionesProhibidas = ['exe', 'dll', 'com', 'bat', 'cmd', 'msi', 'scr', 'lnk', 'sh', 'bash', 'ps1', 'vbs', 'vbe', 'jar', 'php', 'phtml', 'jsp', 'aspx', 'cgi', 'pl', 'htaccess', 'reg', 'ini', 'js', 'db']
      const maxBytes = this.maxFileSize * 1024 * 1024

      for (const file of files) {
          // Primero validar extensiones prohibidas (Seguridad)
          const ext = file.name.split('.').pop().toLowerCase()
          if (extensionesProhibidas.includes(ext)) {
            throw new Error(`El archivo '${file.name}' tiene una extensión no permitida (${ext})`)
          }

          // Luego validar tamaño máximo permitido
          if (file.size > maxBytes) {
            throw new Error(`El archivo ${file.name} excede el límite de ${this.maxFileSize}MB`)
          }
      }
    },
    /** Prepara y envía los archivos al servidor */
    async procesarSubida (files) {
        const formData = new FormData()
        for (let i = 0; i < files.length; i++) {
          formData.append('file', files[i])
        }
        
        const subfolder = this.rutaActual.join('/')
        this.$q.loading.show({ message: 'Subiendo archivos...' })
        
        const response = await this.$http.post('api/HyoArchivo/subir-archivo-ruta', formData, {
          params: {
            project: this.project || undefined,
            folder: this.folder || undefined,
            subfolder: subfolder || undefined
          },
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        const resData = response.data || response
        
        if (resData.errors && resData.errors.length > 0) {
          resData.errors.forEach(err => notify(err, 'warning'))
        }

        if (resData.success) {
          notify('Archivos subidos correctamente', 'positive')
        }
    },
    /** Muestra diálogo para crear carpeta */
    crearCarpetaAccion () {
        this.$q.dialog({
            title: 'Crear Carpeta',
            message: 'Ingrese el nombre de la nueva carpeta:',
            prompt: {
                model: '',
                type: 'text',
                isValid: val => this.validarNombreCarpeta(val)
            },
            cancel: { label: 'Cancelar', flat: true },
            ok: { label: 'Crear', flat: true },
            persistent: true
        }).onOk(data => this.procesarCreacionCarpeta(data))
    },
    /** Ejecuta la creación de la carpeta en el backend */
    async procesarCreacionCarpeta (nombre) {
          try {
              if (!nombre) return
              const subfolder = this.rutaActual.join('/')
              
              await this.$http.post('api/HyoArchivo/crear-carpeta-ruta', {
                  project: this.project || undefined,
                  folder: this.folder || undefined,
                  subfolder: subfolder || undefined,
                  newFolderName: nombre
              })
              
              notify('Carpeta creada correctamente', 'positive')
              this.init()
          } catch (e) {
              console.error('[SIE] Error al crear carpeta:', e)
              notify('Error al crear carpeta: ' + (e.message || 'Error desconocido'), 'error')
          }
    },
    /** Inicializa el componente cargando la lista de archivos */
    async init () {
        this.hasError = false
        try {
            const response = await this.$http.get('api/HyoArchivo/listar-archivos-ruta', {
                params: {
                    project: this.project || undefined,
                    folder: this.folder || undefined
                }
            })
            
            if (!response) {
                 throw new Error('Respuesta vacía del servidor')
            }
            this.treeInfo = response || []
        } catch (e) {
            console.error('Error al cargar archivos:', e)
            this.hasError = true
            notify('Error al cargar archivos: ' + (e.message || 'Error desconocido'), 'error')
        }
    },
    /** Función de comparación para ordenar archivos por tamaño numérico */
    sortBySize (a, b) {
      const parseSize = (sizeStr) => {
        if (!sizeStr) return 0
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        const [val, unit] = sizeStr.split(' ')
        const power = units.indexOf(unit)
        return parseFloat(val) * Math.pow(1024, power > -1 ? power : 0)
      }
      return parseSize(a) - parseSize(b)
    },
    /** Ordena nombres considerando caracteres especiales como ñ */
    sortByName (a, b) {
      return a.localeCompare(b, 'es', { sensitivity: 'base' })
    },
    /** Valida que el nombre de carpeta no contenga caracteres prohibidos */
    validarNombreCarpeta (nombre) {
      if (!nombre || nombre.trim().length === 0) return false
      // Validar caracteres prohibidos de Windows: \ / : * ? " < > |
      const caracteresProhibidos = /[\\/:*?"<>|]/
      return !caracteresProhibidos.test(nombre)
    }
  }
}
