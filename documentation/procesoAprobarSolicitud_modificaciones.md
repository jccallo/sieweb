# Método `procesoAprobarSolicitud` - Tablas y Columnas Modificadas

## 📊 Resumen de Modificaciones

Este método modifica **6 tablas** directamente y **1 tabla** indirectamente a través de stored procedure.

---

## 1️⃣ BECA_SOLICITUD

### Operación: UPDATE

**Columna modificada:**
- `ESTADO` → Valor: `2` (ACEPTADO) o `9` (EXONERADO)

**Código:**
```javascript
await Becasol.updateStateAsync(knex, id, _estado, trx)
```

**Valor depende de:**
- Si `exonerar = 0` → `ESTADO = 2` (ACEPTADO)
- Si `exonerar ≠ 0` → `ESTADO = 9` (EXONERADO)

---

## 2️⃣ BECA_ESTADO_FECHA

### Operación: INSERT

**Columnas insertadas:**

| Columna | Valor |
|---------|-------|
| `ID_BECA_SOLICITUD` | `id` (parámetro) |
| `ESTADO_FECHA` | `10` (si agregaEstudiante=true) o `2/9` (según exonerar) |
| `FECHA` | `new Date()` (fecha/hora actual) |
| `USUCOD` | `token.USUCOD` (usuario autenticado) |

**Código:**
```javascript
const dataEstado = {
    ID_BECA_SOLICITUD: id,
    ESTADO_FECHA: agregaEstudiante ? ESTADO_ESTUDIANTE_AGREGADO : _estado,
    FECHA: new Date(),
    USUCOD: token.USUCOD
}
await becaestadofecha.saveEstadoAsync(knex, dataEstado, trx)
```

---

## 3️⃣ BECA_PARTICIPANTE

### Operación: INSERT (múltiples registros)

**Columnas insertadas (por cada estudiante):**

| Columna | Valor |
|---------|-------|
| `ID_BECA_SOLICITUD` | `id` (parámetro) |
| `ACEPTADO` | `1` (siempre) |
| `ALUCOD` | `estudiantes[i].ALUCOD` |

**Código:**
```javascript
arrInsert.push({
    ID_BECA_SOLICITUD: id,
    ACEPTADO: 1,
    ALUCOD: alucod
})
await becaparticipante.saveParticipantesAsync(knex, arrInsert, trx)
```

**Cantidad de registros:** Uno por cada estudiante en el array `estudiantes`

---

## 4️⃣ BECA_DOC_ASIGNA

### Operación: INSERT (múltiples registros)

**Columnas insertadas:**

### Documentos Individuales (DOC_GRUPAL = 2):

| Columna | Valor |
|---------|-------|
| `ID_BECA_SOLICITUD` | `id` |
| `ID_BECA_DOCUMENTO` | `doc.ID_BECA_DOCUMENTO` |
| `ALUCOD` | `alucod` (del estudiante) |

**Cantidad:** `N estudiantes × M documentos individuales`

### Documentos Familiares (DOC_GRUPAL = 1):

| Columna | Valor |
|---------|-------|
| `ID_BECA_SOLICITUD` | `id` |
| `ID_BECA_DOCUMENTO` | `doc.ID_BECA_DOCUMENTO` |
| `ALUCOD` | `NULL` |

**Cantidad:** `M documentos familiares` (solo si `agregaEstudiante = false`)

**Código:**
```javascript
// Individuales
docsByAlu.forEach(doc => {
    arrDocsAsig.push({
        ID_BECA_SOLICITUD: id,
        ID_BECA_DOCUMENTO: doc.ID_BECA_DOCUMENTO,
        ALUCOD: alucod
    })
})

// Familiares
docsByFam.forEach(doc => {
    arrDocsAsig.push({
        ID_BECA_SOLICITUD: id,
        ID_BECA_DOCUMENTO: doc.ID_BECA_DOCUMENTO
    })
})

await becadocasigna.saveAsignacionAsync(knex, arrDocsAsig, trx)
```

---

## 5️⃣ COBRO (vía Stored Procedure)

### Operación: INSERT (múltiples registros)

**Stored Procedure:** `SP_CREAR_DEUDA_SERVICIO`

**Condición:** Solo si `exonerar = 0`

**Columnas insertadas (por cada cuota del calendario):**

| Columna | Valor |
|---------|-------|
| `ANOCOB` | Año del calendario |
| `ALUCOD` | `alucod` (del estudiante) |
| `CONCOB` | Concepto del calendario |
| `MESCOB` | Mes del calendario |
| `FECEMI` | Fecha emisión del calendario |
| `FECVEN` | Fecha vencimiento del calendario |
| `MONCOD` | Código moneda del calendario |
| `MONTOINI` | Monto del calendario |
| `MONTOCOB` | Monto del calendario |
| `MONTODES` | `0` |
| `MONTOPEN` | Monto del calendario |
| `ESTCOB` | `'P'` (Pendiente) |
| `MORA` | `0` o `1` (según configuración) |
| `ID_PERFIL` | `1` (Estudiante) |
| `ID_PERSONA` | ID_PERSONA del alumno |
| `ID_TIPOCOBRO` | `3` (BECA) |

**Código:**
```javascript
if (exonerar === 0) {
    await knex.raw(`execute procedure SP_CREAR_DEUDA_SERVICIO(
        '${alucod}',           // Alumno
        ${dataPer.ANOBEC},     // Año
        ${CON_BECA}            // Tipo = 3 (BECA)
    );`)
}
```

**Cantidad:** `N estudiantes × M cuotas del calendario`

---

## 6️⃣ FRM_DESTINATARIO_USUARIO

### Operación: INSERT (condicional)

**Condición:** 
- Solo colegios `'0193'` o `'0081'`
- Solo si NO existe el destinatario

**Columnas insertadas:**

| Columna | Valor |
|---------|-------|
| `USUCOD` | Usuario de la familia (SISCOD=21) |
| `ID_HISTORIA_FORMULARIO` | ID del formulario de encuesta |

**Código:**
```javascript
if (ALLOW_ASIGNAR_ENCUESTA.indexOf(token.COLCOD) !== -1) {
    // ... búsquedas ...
    if (typeof rowDestinatarioUsuario === "undefined") {
        await knex('FRM_DESTINATARIO_USUARIO').insert({
            USUCOD: rowUsuario.USUCOD,
            ID_HISTORIA_FORMULARIO: rowHistoriaFrm.ID_HISTORIA_FORMULARIO
        })
    }
}
```

---

## 7️⃣ Tablas Modificadas por Stored Procedures Adicionales

### FICHA_PRESUPUESTO (vía `sp_aperturar_ficha_economica`)

**Condición:**
- Solo colegios `'0057'`, `'0193'`, `'0081'`
- Solo si `agregaEstudiante = false`

**Parámetros:**
- `famcod`: Código de familia
- `'001'`: Tipo de ficha
- `fichaAnual`: Año de la ficha

**Código:**
```javascript
if (ALLOW_GENERATE_FICHA.indexOf(token.COLCOD) !== -1 && !agregaEstudiante) {
    await knex.raw(`execute procedure sp_aperturar_ficha_economica(?,?,?);`,
        [famcod, '001', fichaAnual])
}
```

**Nota:** No se especifica qué columnas modifica este SP (requiere análisis del procedimiento)

---

## 📋 Resumen por Tabla

| # | Tabla | Operación | Registros | Condición |
|---|-------|-----------|-----------|-----------|
| 1 | BECA_SOLICITUD | UPDATE | 1 | Siempre |
| 2 | BECA_ESTADO_FECHA | INSERT | 1 | Siempre |
| 3 | BECA_PARTICIPANTE | INSERT | N estudiantes | Siempre |
| 4 | BECA_DOC_ASIGNA | INSERT | N×M docs individuales + M docs familiares | Siempre |
| 5 | COBRO | INSERT | N×M cuotas | Solo si exonerar=0 |
| 6 | FRM_DESTINATARIO_USUARIO | INSERT | 0 o 1 | Solo colegios '0193','0081' |
| 7 | FICHA_PRESUPUESTO | ? | ? | Solo colegios '0057','0193','0081' y agregaEstudiante=false |

---

## 🔢 Ejemplo Numérico

**Escenario:**
- 3 estudiantes
- 2 documentos individuales
- 1 documento familiar
- 10 cuotas en calendario
- Colegio '0193'
- exonerar = 0
- agregaEstudiante = false

**Registros creados:**

| Tabla | Registros |
|-------|-----------|
| BECA_SOLICITUD | 1 UPDATE |
| BECA_ESTADO_FECHA | 1 INSERT |
| BECA_PARTICIPANTE | 3 INSERT |
| BECA_DOC_ASIGNA | 7 INSERT (3×2 + 1) |
| COBRO | 30 INSERT (3×10) |
| FRM_DESTINATARIO_USUARIO | 1 INSERT |
| FICHA_PRESUPUESTO | ? (vía SP) |

**Total:** ~43 registros modificados
