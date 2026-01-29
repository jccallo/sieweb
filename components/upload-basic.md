# Documentación: Utilidad `Basic` (Carga de Archivos)

La función `Basic` es una utilidad de red diseñada para realizar peticiones **HTTP POST** enviando archivos y datos adicionales mediante el formato `multipart/form-data`. Es el puente ideal entre el componente `sie-upload` y tus controladores de Node.js (como `ExampleController`).

## 1. ¿Qué hace esta función?

1. **Validación**: Comprueba que el archivo exista antes de intentar enviarlo.
2. **FormData automático**: Construye el objeto `FormData` necesario para subidas de archivos, adjuntando tanto el archivo como cualquier objeto de datos extra que le pases.
3. **Gestión de URL**: Puede usar una URL relativa o construir una absoluta usando el origen de la aplicación (`getOrigin`).
4. **Seguimiento de Progreso**: Ofrece un callback (`onProgress`) que calcula y devuelve el porcentaje de subida en tiempo real (0 a 100), ideal para mostrar barras de carga.

---

## 2. Ejemplo de Uso Mínimo

Ideal para cuando solo necesitas subir un archivo sin parámetros extra.

```javascript
import { Basic } from 'utils/upload'

const subirFoto = async (archivo) => {
  try {
    const respuesta = await Basic({
      url: 'intranet/example/addPersonaConFoto',
      file: archivo, // El objeto File obtenido de sie-upload
      root: true     // Para que use la URL base del servidor
    })
    console.log('Subida exitosa:', respuesta.data)
  } catch (err) {
    console.error('Error al subir:', err.message)
  }
}
```

---

## 3. Ejemplo de Uso Complejo

Incluye envío de datos adicionales (campos de formulario) y seguimiento del progreso de la carga.

```javascript
import { Basic } from 'utils/upload'

const registrarConProgreso = async (archivo, datosFormulario) => {
  return Basic({
    url: 'intranet/example/addPersonaConFoto',
    file: archivo,
    root: true,
    // 1. Enviamos datos adicionales (campos de texto)
    data: {
      alucod: datosFormulario.codigo,
      nombre: datosFormulario.nombre,
      correo: datosFormulario.email
    },
    // 2. Callback para actualizar una barra de progreso en la UI
    onProgress: (porcentaje, evento) => {
      console.log(`Progreso: ${porcentaje}%`)
      this.progresoCarga = porcentaje // Supongamos que es una variable de Vue
    }
  }).then(res => {
    this.$q.notify({ message: 'Registro completado', color: 'positive' })
  }).catch(err => {
    this.$q.notify({ message: 'Error: ' + err.message, color: 'negative' })
  })
}
```

---

## 4. Parámetros de la Función

| Parámetro | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `url` | String | Sí | El endpoint al que se enviará el archivo. |
| `file` | File / Blob | Sí | El archivo físico capturado del input o `sie-upload`. |
| `root` | Boolean | No | Si es `true`, antepone el origen de la API a la URL. |
| `data` | Object | No | Objeto de clave-valor con campos extra para el `FormData`. |
| `onProgress`| Function | No | Callback que recibe `(percentage, event)` durante la subida. |

---

## 5. Integración con el Backend (Node.js)

En el lado del servidor (`ExampleController.js`), recibirás estos datos así:

- El `file` llegará dentro de `fields.file` (vía `saveFileAsync`).
- Los datos de `data` llegarán como campos normales en `fields` (ej: `fields.alucod`).
