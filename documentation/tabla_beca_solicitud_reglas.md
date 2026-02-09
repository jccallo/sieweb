# BECA_SOLICITUD - Reglas de Negocio por Campo

## 1. Regla de Identificación Única (ID_BECA_SOLICITUD)

Esta tabla registra las **solicitudes de beca** de las familias. Cada solicitud tiene un identificador único generado automáticamente por la secuencia `GEN_BECA_SOLICITUD_ID`.

**Tipo:** BIGINT (Primary Key)

**Regla:** El ID se genera automáticamente al crear una solicitud y nunca se modifica.

---

## 2. Regla de Periodo Único por Familia (ID_BECA_PERIODO + FAMCOD)

Cada familia puede tener **solo UNA solicitud por periodo de becas**.

**Tipo:** BIGINT (Foreign Key → BECA_PERIODO)

**Validación:** Al crear una solicitud (`procesoSolicitud`), el sistema verifica:
```javascript
const { exist } = await this.haveFamSolAsync(knex, _famcod)
if (exist) {
    throw new SieError('La familia ya tiene registrada una solicitud')
}
```

**Nota:** El periodo debe estar activo para poder crear solicitudes.

---

## 3. Regla de Requisitos por Colegio (FAMCOD)

Cada familia debe cumplir requisitos específicos según el colegio antes de poder solicitar beca.

**Tipo:** VARCHAR(8) (Foreign Key → FAMILIA)

### Colegio '0057':
- **Antigüedad:** Mínimo 4 años (año actual - año ingreso > 3)
- **Hijos activos:** Más de 1 hijo matriculado
- **Historial de becas:** Menos de 18 meses de beca previa

### Colegio '0010':
- **Permanencia:** Mínimo 2 años
- **Hijos activos:** Máximo 2 hijos

### Todos los colegios:
- **Sin deudas pendientes** (solo colegios configurados)
- **Sin solicitud previa** en el periodo activo

---

## 4. Regla de Auditoría Temporal (FECHA_REG)

Toda solicitud debe registrar la fecha y hora exacta de su creación para trazabilidad.

**Tipo:** TIMESTAMP (NOT NULL, DEFAULT CURRENT_DATE)

**Regla:** Se asigna automáticamente `new Date()` al crear la solicitud y **nunca se modifica**.

**Uso:**
- Ordenar solicitudes cronológicamente (más recientes primero)
- Filtrar por rango de fechas
- Auditoría del proceso

---

## 5. Regla de Flujo de Estados (ESTADO)

El estado controla el ciclo de vida de la solicitud y determina qué acciones están permitidas.

**Tipo:** SMALLINT (NOT NULL, DEFAULT 1)

### Estados Iniciales (Creación):
- **1 - SOLICITADO:** Estado por defecto al crear la solicitud

### Estados de Decisión (Aprobación/Rechazo):
- **2 - ACEPTADO:** Aprobada, genera deuda automática (concepto BECA = 3)
- **3 - RECHAZADO:** Solicitud rechazada, proceso terminado
- **9 - EXONERADO:** Aprobada sin generar deuda

### Estados de Seguimiento (Expediente):
- **5 - EXP_PEN:** Esperando documentos
- **6 - EXP_COM:** Documentos completos (cambio automático)
- **7 - EXP_VAL:** Documentos validados (cambio automático)

### Estados Especiales:
- **4 - PAGO:** Tiene pagos registrados
- **8 - RESOLUCION:** En resolución final
- **10 - ESTUDIANTE_AGREGADO:** Hijo agregado posteriormente

---

## 6. Regla de Transición Automática de Estados

Algunos cambios de estado ocurren automáticamente sin intervención manual.

**Estados automáticos:**

### EXP_PEN (5) → EXP_COM (6):
```javascript
// Cuando todos los documentos están subidos
const { complete } = await checkExpedienteCompletoAsync(knex, idBecaSol, trx)
if (complete && row.ESTADO === ESTADO_EXP_PEN) {
    await updateStateAsync(knex, idBecaSol, ESTADO_EXP_COM, trx)
}
```

### EXP_COM (6) → EXP_VAL (7):
```javascript
// Cuando el administrador valida el expediente
const { validate } = await checkExpedienteValidadoAsync(knex, idBecaSol, trx)
if (validate && row.ESTADO === ESTADO_EXP_COM) {
    await updateStateAsync(knex, idBecaSol, ESTADO_EXP_VAL, trx)
}
```

---

## 7. Regla de Integridad Referencial (Eliminación Segura)

No se puede eliminar una solicitud si tiene datos relacionados críticos.

**Restricciones de eliminación:**

### ❌ No se puede eliminar si:

1. **Tiene pagos registrados:**
```javascript
if (dataSol.ESTADO >= ESTADO_PAGO && dataSol.ESTADO !== ESTADO_EXONERADO) {
    throw new SieError('La solicitud no se puede eliminar, existen pagos registrados')
}
```

2. **Tiene deuda generada:**
```javascript
if (dataSol.ESTADO === ESTADO_ACEPTADO && _flag === 0) {
    throw new SieError('La solicitud ya tiene deuda generada, debe eliminarla desde el módulo de Pensiones')
}
```

### ✅ Proceso de eliminación en cascada:
```javascript
// Orden obligatorio:
1. BECA_DOC_ASIGNA (documentos asignados)
2. BECA_PARTICIPANTE (participantes)
3. BECA_ESTADO_FECHA (historial de estados)
4. BECA_SOLICITUD (solicitud principal)
```

---

## 8. Regla de Generación de Deuda Automática

Al aprobar una solicitud sin exonerar, se genera automáticamente una deuda por concepto de BECA.

**Condición:** `exonerar = 0` en `procesoAprobarSolicitud`

**Proceso:**
```javascript
if (exonerar === 0) {
    // Para cada alumno aprobado:
    await knex.raw(`execute procedure SP_CREAR_DEUDA_SERVICIO(
        '${alucod}',      // Código del alumno
        ${dataPer.ANOBEC}, // Año de la beca
        ${CON_BECA}        // Concepto = 3 (BECA)
    );`)
}
```

**Nota:** Si `exonerar ≠ 0`, el estado cambia a EXONERADO (9) y NO se genera deuda.

---

## 9. Regla de Historial de Cambios

Cada cambio de estado debe registrarse en la tabla `BECA_ESTADO_FECHA` para auditoría.

**Implementación:**
```javascript
const dataEstado = {
    ID_BECA_SOLICITUD: id,
    ESTADO_FECHA: nuevoEstado,
    FECHA: new Date(),
    USUCOD: token.USUCOD  // Usuario que realizó el cambio
}
await Becasol.app.models.becaestadofecha.saveEstadoAsync(knex, dataEstado, trx)
```

**Regla:** **Nunca** se actualiza el estado sin registrar el cambio en el historial.

---

## 10. Regla de Asignación de Documentos

Al aprobar una solicitud, se asignan automáticamente documentos según su tipo.

**Tipos de documentos:**

### DOC_GRUPAL = 1 (Familiar):
- Se asigna **uno solo** para toda la familia
- **NO se asigna** si es `agregaEstudiante = true`

### DOC_GRUPAL = 2 (Individual):
- Se asigna **uno por cada estudiante** aprobado

**Código:**
```javascript
const docsByAlu = docs.filter(item => item.DOC_GRUPAL === 2)
const docsByFam = docs.filter(item => item.DOC_GRUPAL === 1 && !agregaEstudiante)

// Asignar documentos individuales
docsByAlu.forEach(doc => {
    arrDocsAsig.push({
        ID_BECA_SOLICITUD: id,
        ID_BECA_DOCUMENTO: doc.ID_BECA_DOCUMENTO,
        ALUCOD: alucod  // Por cada alumno
    })
})

// Asignar documentos familiares
docsByFam.forEach(doc => {
    arrDocsAsig.push({
        ID_BECA_SOLICITUD: id,
        ID_BECA_DOCUMENTO: doc.ID_BECA_DOCUMENTO
        // Sin ALUCOD (es familiar)
    })
})
```

---

## 11. Regla de Procesos Especiales por Colegio

Algunos colegios ejecutan procesos adicionales al aprobar solicitudes.

### Colegios '0057', '0193', '0081':
**Generan ficha económica automática:**
```javascript
if (ALLOW_GENERATE_FICHA.indexOf(token.COLCOD) !== -1 && !agregaEstudiante) {
    await knex.raw(`execute procedure sp_aperturar_ficha_economica(?,?,?);`,
        [famcod, '001', fichaAnual])
}
```

### Colegios '0193', '0081':
**Asignan encuesta automática:**
- '0193' → Formulario 194
- '0081' → Formulario 72

```javascript
if (ALLOW_ASIGNAR_ENCUESTA.indexOf(token.COLCOD) !== -1) {
    const idFormulario = ENCUESTAS[token.COLCOD]
    // Asigna formulario a la familia
}
```

---

## 12. Regla de Agregar Estudiante Posterior

Permite agregar hijos a una familia ya aprobada sin repetir procesos familiares.

**Parámetro:** `agregaEstudiante = true`

**Diferencias con aprobación normal:**
- ❌ NO asigna documentos familiares (solo individuales)
- ❌ NO genera ficha económica
- ✅ Estado: ESTUDIANTE_AGREGADO (10)
- ✅ Genera deuda solo para el nuevo hijo (si no exonerado)

**Uso:** Cuando una familia aprobada tiene un nuevo hijo que debe incluirse en la beca.

---

## Resumen de Validaciones por Operación

| Operación | Validaciones |
|-----------|--------------|
| **CREATE** | Periodo activo, familia sin solicitud previa, requisitos por colegio, sin deudas |
| **UPDATE** | Solo campo ESTADO, registro en historial obligatorio |
| **DELETE** | Sin pagos (estado < 4 o = 9), sin deuda generada (estado ≠ 2 o flag = 1) |
| **APROBAR** | Al menos 1 estudiante, periodo vigente, documentos configurados |
| **RECHAZAR** | Ninguna restricción especial |

---

## Conceptos Clave

- **CON_BECA = 3:** Concepto de cobro para becas en el sistema de pensiones
- **Antigüedad:** Año actual - Año de ingreso de la familia
- **Hijos activos:** Alumnos con MATRICULA='S' y estado no en (F,R,E,T,D)
- **Historial de becas:** Suma de meses becados (límite: 18 meses ≈ 2 años)
