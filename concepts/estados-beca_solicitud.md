# Campo ESTADO de la Tabla BECA_SOLICITUD

## 📊 10 Estados Posibles

| Valor | Constante | Descripción |
|-------|-----------|-------------|
| **1** | ESTADO_SOLICITADO | Solicitud creada |
| **2** | ESTADO_ACEPTADO | Aprobada sin exonerar (genera deuda) |
| **3** | ESTADO_RECHAZADO | Solicitud rechazada |
| **4** | ESTADO_PAGO | Pago registrado |
| **5** | ESTADO_EXP_PEN | Expediente pendiente (inicia carga docs) |
| **6** | ESTADO_EXP_COM | Expediente completo (automático) |
| **7** | ESTADO_EXP_VAL | Expediente validado (automático) |
| **8** | ESTADO_RESOLUCION | Resolución emitida |
| **9** | ESTADO_EXONERADO | Aprobada con exoneración (sin deuda) |
| **10** | ESTADO_ESTUDIANTE_AGREGADO | Hijo agregado posteriormente |

---

## 🔄 Flujo de Estados

```
1 (SOLICITADO)
    ↓
2 (ACEPTADO) o 9 (EXONERADO) o 3 (RECHAZADO)
    ↓
5 (EXP_PEN) - Inicia carga de documentos
    ↓
6 (EXP_COM) - Documentos completos (automático)
    ↓
7 (EXP_VAL) - Expediente validado (automático)
    ↓
8 (RESOLUCION) - Resolución emitida
```

---

## 📝 Cuándo se Asigna Cada Estado

| Estado | Cuándo | Método |
|--------|--------|--------|
| 1 | Al crear solicitud | `procesoSolicitud` |
| 2 | Al aprobar sin exonerar | `procesoAprobarSolicitud` (exonerar=0) |
| 3 | Al rechazar | `updateEstadosSol` |
| 4 | Al registrar pago | `updateEstadosSol` |
| 5 | Al iniciar expediente | `updateEstadosSol` |
| 6 | Documentos completos | Automático |
| 7 | Expediente validado | Automático |
| 8 | Al emitir resolución | `updateEstadosSol` |
| 9 | Al aprobar con exoneración | `procesoAprobarSolicitud` (exonerar≠0) |
| 10 | Al agregar hijo posterior | `procesoAprobarSolicitud` (agregaEstudiante=true) |

---

## 🎯 Estados Especiales

### Estados que Generan Deuda
- **2 (ACEPTADO)**: Genera deuda automática vía `SP_CREAR_DEUDA_SERVICIO`

### Estados que NO Generan Deuda
- **9 (EXONERADO)**: Aprobado pero sin generar deuda

### Estados Automáticos
- **6 (EXP_COM)**: Se asigna cuando todos los documentos están completos
- **7 (EXP_VAL)**: Se asigna cuando el admin valida el expediente

---

## 📍 Definición en el Código

**Archivo:** `d:\sieweb\siewebjs\common\models\becasolicitud.js` (líneas 1-10)

```javascript
const ESTADO_SOLICITADO = 1
const ESTADO_ACEPTADO = 2
const ESTADO_RECHAZADO = 3
const ESTADO_PAGO = 4
const ESTADO_EXP_PEN = 5
const ESTADO_EXP_COM = 6
const ESTADO_EXP_VAL = 7
const ESTADO_RESOLUCION = 8
const ESTADO_EXONERADO = 9
const ESTADO_ESTUDIANTE_AGREGADO = 10
```

---

## 🔍 Validaciones por Estado

### No se puede eliminar si:
- `ESTADO >= 4` (tiene pagos)
- `ESTADO = 2` (tiene deuda generada)

### Excepciones:
- `ESTADO = 9` (EXONERADO): Sí se puede eliminar (no tiene deuda)
