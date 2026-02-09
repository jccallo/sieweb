# BECA_PARTICIPANTE - Reglas de Negocio

## 📊 Estructura de la Tabla

```sql
CREATE TABLE BECA_PARTICIPANTE (
    ID_BECA_PARTICIPANTE BIGINT NOT NULL,
    ID_BECA_SOLICITUD BIGINT NOT NULL,
    ACEPTADO SMALLINT DEFAULT 0 NOT NULL,
    ALUCOD VARCHAR(8) NOT NULL,
    CONSTRAINT PK_BECA_PARTICIPANTE PRIMARY KEY (ID_BECA_PARTICIPANTE),
    CONSTRAINT BECA_PARTCIPANTE_SOLICITUD FOREIGN KEY (ID_BECA_SOLICITUD) 
        REFERENCES BECA_SOLICITUD(ID_BECA_SOLICITUD)
);
```

---

## 🔍 Campos y Valores

| Campo | Tipo | Descripción | Valores |
|-------|------|-------------|---------|
| **ID_BECA_PARTICIPANTE** | BIGINT | Identificador único | Generado automáticamente |
| **ID_BECA_SOLICITUD** | BIGINT | Solicitud a la que pertenece | FK → BECA_SOLICITUD |
| **ACEPTADO** | SMALLINT | Indica si fue aceptado | 0 = No, 1 = Sí (default: 0) |
| **ALUCOD** | VARCHAR(8) | Código del alumno | FK → ALUMNO (ej: 'ALU001') |

---

## 📋 Reglas de Negocio

### 1. Regla de Registro de Estudiantes Aprobados
Esta tabla almacena los **estudiantes (hijos) que fueron incluidos y aprobados** en una solicitud de beca.

**Cuándo se crea:** Al aprobar una solicitud en `procesoAprobarSolicitud`

```javascript
arrInsert.push({
    ID_BECA_SOLICITUD: id,
    ACEPTADO: 1,
    ALUCOD: alucod
})
await saveParticipantesAsync(knex, arrInsert, trx)
```

---

### 2. Regla de Aceptación por Defecto
El campo `ACEPTADO` siempre se asigna con valor **1** al crear el registro.

**Valores:**
- **0:** No aceptado (valor por defecto en BD, pero nunca se usa)
- **1:** Aceptado (siempre se inserta con este valor)

**Nota:** En la práctica, si un estudiante está en esta tabla, significa que fue aceptado.

---

### 3. Regla de Inserción en Bloque
Los participantes se insertan en lotes de hasta 50 registros para optimizar performance.

```javascript
await Becapar.app.insertarBloque(data, knex, 'beca_participante', trx, 50)
```

**Ventaja:** Reduce el número de queries a la base de datos.

---

### 4. Regla de Eliminación en Cascada
Al eliminar una solicitud, se eliminan **todos** sus participantes automáticamente.

```javascript
await deleteParticipanteBySolAsync(knex, idSol, trx)
// Elimina todos los registros donde ID_BECA_SOLICITUD = idSol
```

**Orden de eliminación en `procesoEliminarSolicitud`:**
1. BECA_DOC_ASIGNA
2. **BECA_PARTICIPANTE** ← Aquí
3. BECA_ESTADO_FECHA
4. BECA_SOLICITUD

---

### 5. Regla de Consulta por Familia
Solo se muestran participantes de solicitudes en estado **≥ 4** (PAGO o superior) y alumnos activos.

```javascript
.where('BS.ESTADO', '>=', 4)
.where('a.activo', 1)
```

**Estados válidos:** 4 (PAGO), 5 (EXP_PEN), 6 (EXP_COM), 7 (EXP_VAL), 8 (RESOLUCION), 9 (EXONERADO)

**Excluye:** Estados 1 (SOLICITADO), 2 (ACEPTADO), 3 (RECHAZADO)

---

### 6. Regla de Relación con Alumno
Cada participante debe ser un alumno válido de la familia solicitante.

**Validación implícita:** Al aprobar, solo se pueden seleccionar alumnos de la familia.

**Uso:** Permite identificar qué hijos de la familia están becados.

---

### 7. Regla de Generación de Deuda Individual
Por cada participante aceptado, se genera una deuda automática (si no es exonerado).

```javascript
if (exonerar === 0) {
    await knex.raw(`execute procedure SP_CREAR_DEUDA_SERVICIO(
        '${alucod}',      // Código del participante
        ${dataPer.ANOBEC},
        ${CON_BECA}       // Concepto = 3
    );`)
}
```

---

### 8. Regla de Asignación de Documentos Individuales
Por cada participante, se asignan documentos individuales (DOC_GRUPAL = 2).

```javascript
docsByAlu.forEach(doc => {
    arrDocsAsig.push({
        ID_BECA_SOLICITUD: id,
        ID_BECA_DOCUMENTO: doc.ID_BECA_DOCUMENTO,
        ALUCOD: alucod  // Del participante
    })
})
```

---

### 9. Regla de Consulta con Información Académica
Al consultar participantes, se incluye información del salón actual del alumno.

```javascript
const nemodes = "(select s.nemodes from salon_al as sa 
                 inner join salon as s on s.nemo = sa.nemo 
                 where s.ano = '"+token.ANO+"' and sa.alucod = a.alucod)"
```

**Retorna:** ID_BECA_SOLICITUD, ALUCOD, NOMCOMP (nombre), NEMODES (salón)

---

### 10. Regla de Sincronización de Documentos
Al sincronizar documentos nuevos, se asignan a todos los participantes existentes.

```javascript
const dataPar = await getParticipantesBySolAsync(knex, id, trx)
for (participante of dataPar) {
    arrDocAsig.push({
        ID_BECA_SOLICITUD: id,
        ID_BECA_DOCUMENTO: row.ID_BECA_DOCUMENTO,
        ALUCOD: participante.ALUCOD
    })
}
```

---

## 📝 Resumen en 10 Líneas

1. **Tabla de estudiantes incluidos en solicitudes de beca** con 4 campos: ID (PK), ID_SOLICITUD (FK), ACEPTADO (0/1), ALUCOD (FK).

2. **Se crea al aprobar solicitud** - Inserta un registro por cada estudiante seleccionado con ACEPTADO=1.

3. **Inserción en bloque** - Hasta 50 registros por lote para optimizar performance.

4. **Eliminación automática** - Al eliminar solicitud, se borran todos sus participantes (cascada manual).

5. **Genera deuda individual** - Por cada participante se ejecuta SP_CREAR_DEUDA_SERVICIO si no es exonerado.

6. **Asigna documentos individuales** - Documentos con DOC_GRUPAL=2 se asignan uno por participante.

7. **Consulta solo estados avanzados** - Solo muestra participantes de solicitudes con estado ≥4 y alumnos activos.

8. **Incluye información académica** - Consultas traen nombre completo y salón actual del alumno.

9. **Sincronización de documentos** - Documentos nuevos se asignan a todos los participantes existentes.

10. **Relación obligatoria** - Cada participante debe ser alumno válido de la familia solicitante.
