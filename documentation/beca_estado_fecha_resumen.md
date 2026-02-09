# BECA_ESTADO_FECHA - Resumen de Tabla

## 📊 Propósito
Tabla de **historial de cambios de estado** de las solicitudes de beca. Registra cada transición de estado con fecha y usuario responsable para auditoría completa.

---

## 🗄️ Estructura de la Tabla

```sql
CREATE TABLE BECA_ESTADO_FECHA (
    ID_BECA_ESTADO_FECHA BIGINT NOT NULL,
    ID_BECA_SOLICITUD BIGINT NOT NULL,
    ESTADO_FECHA SMALLINT NOT NULL,
    FECHA TIMESTAMP DEFAULT CURRENT_DATE NOT NULL,
    USUCOD VARCHAR(12) NOT NULL,
    CONSTRAINT PK_BECA_ESTADO_FECHA PRIMARY KEY (ID_BECA_ESTADO_FECHA),
    CONSTRAINT BECA_ESTADO_FECHA_SOLICITUD FOREIGN KEY (ID_BECA_SOLICITUD) 
        REFERENCES BECA_SOLICITUD(ID_BECA_SOLICITUD)
);
```

---

## 🔍 Campos y Valores

### 1. ID_BECA_ESTADO_FECHA (BIGINT, PK)
**Descripción:** Identificador único del registro de historial

**Valores:** Generado automáticamente por secuencia

---

### 2. ID_BECA_SOLICITUD (BIGINT, FK, NOT NULL)
**Descripción:** Solicitud a la que pertenece este cambio de estado

**Valores:** FK → `BECA_SOLICITUD.ID_BECA_SOLICITUD`

**Uso:** Permite ver todo el historial de una solicitud

---

### 3. ESTADO_FECHA (SMALLINT, NOT NULL)
**Descripción:** Estado al que cambió la solicitud en este momento

**Valores posibles:**

| Valor | Estado | Cuándo se registra |
|-------|--------|-------------------|
| 1 | SOLICITADO | Al crear la solicitud |
| 2 | ACEPTADO | Al aprobar sin exonerar |
| 3 | RECHAZADO | Al rechazar |
| 4 | PAGO | Al registrar pago |
| 5 | EXP_PEN | Al iniciar expediente |
| 6 | EXP_COM | Cuando expediente completo (automático) |
| 7 | EXP_VAL | Cuando expediente validado (automático) |
| 8 | RESOLUCION | Al emitir resolución |
| 9 | EXONERADO | Al aprobar con exoneración |
| 10 | ESTUDIANTE_AGREGADO | Al agregar hijo posterior |

**Nota:** Puede ser diferente al estado actual de `BECA_SOLICITUD.ESTADO` porque registra el historial completo.

---

### 4. FECHA (TIMESTAMP, NOT NULL, DEFAULT CURRENT_DATE)
**Descripción:** Fecha y hora exacta del cambio de estado

**Valores:** `new Date()` al momento del cambio

**Uso:** 
- Auditoría temporal
- Calcular tiempo entre estados
- Ordenar historial cronológicamente

---

### 5. USUCOD (VARCHAR(12), NOT NULL)
**Descripción:** Usuario que realizó el cambio de estado

**Valores:** Código del usuario autenticado (`token.USUCOD`)

**Uso:**
- Auditoría de responsabilidad
- Identificar quién aprobó/rechazó
- Trazabilidad completa

---

## 📝 Resumen en 10 Líneas

1. **Tabla de historial de estados** con 5 campos: ID (PK), ID_SOLICITUD (FK), ESTADO_FECHA (1-10), FECHA (timestamp), USUCOD.

2. **Se inserta un registro** cada vez que cambia el estado de una solicitud de beca.

3. **ESTADO_FECHA toma valores 1-10** igual que BECA_SOLICITUD.ESTADO, pero registra el historial completo.

4. **FECHA registra timestamp exacto** del cambio para auditoría temporal y cálculo de tiempos.

5. **USUCOD identifica** al usuario responsable del cambio (quién aprobó, rechazó, etc.).

6. **No se actualiza, solo se inserta** - Cada cambio crea un nuevo registro (append-only).

7. **Validación de duplicados** - `existsEstadoAsync` verifica si ya existe el estado antes de insertar.

8. **Eliminación en cascada** - Al eliminar solicitud, se borran todos sus registros de historial.

9. **Consulta de historial** - `getHistorial(id)` retorna todos los cambios de una solicitud ordenados.

10. **Relación 1:N** - Una solicitud puede tener múltiples registros de historial (uno por cada cambio).

---

## 🔄 Ejemplo de Historial

**Solicitud ID: 123**

| ID | ESTADO_FECHA | FECHA | USUCOD | Descripción |
|----|--------------|-------|--------|-------------|
| 1 | 1 | 2024-03-01 10:00 | USR001 | Solicitud creada |
| 2 | 2 | 2024-03-05 14:30 | ADM001 | Aprobada por admin |
| 3 | 5 | 2024-03-06 09:00 | USR001 | Inicia carga de docs |
| 4 | 6 | 2024-03-10 16:45 | SYSTEM | Docs completos (auto) |
| 5 | 7 | 2024-03-11 11:20 | ADM001 | Docs validados (auto) |
| 6 | 8 | 2024-03-15 13:00 | ADM002 | Resolución emitida |

---

## 🛠️ Métodos Principales

### `saveEstadoAsync(knex, data, trx)`
Inserta nuevo registro de estado (con validación de duplicados)

### `existsEstadoAsync(knex, id, estado, trx)`
Verifica si ya existe un estado registrado

### `deleteEstadoAsync(knex, idSol, trx)`
Elimina todo el historial de una solicitud

### `getHistorial(id)`
Obtiene historial completo de una solicitud
