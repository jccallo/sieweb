# Resumen Ejecutivo - Reglas de Negocio BECA_SOLICITUD

## 🎯 Propósito del Sistema
Gestionar el ciclo completo de solicitudes de becas escolares, desde la creación hasta la aprobación y seguimiento de expedientes.

---

## 🗄️ Estructura de la Tabla BECA_SOLICITUD

```sql
CREATE TABLE BECA_SOLICITUD (
    ID_BECA_SOLICITUD BIGINT NOT NULL,
    ID_BECA_PERIODO BIGINT NOT NULL,
    FAMCOD VARCHAR(8) NOT NULL,
    FECHA_REG TIMESTAMP DEFAULT CURRENT_DATE NOT NULL,
    ESTADO SMALLINT DEFAULT 1 NOT NULL,
    CONSTRAINT PK_BECA_SOLICITUD PRIMARY KEY (ID_BECA_SOLICITUD),
    CONSTRAINT BECA_SOLICITUD_PERIODO FOREIGN KEY (ID_BECA_PERIODO) 
        REFERENCES BECA_PERIODO(ID_BECA_PERIODO)
);
```

### Campos y Valores

| Campo | Tipo | Descripción | Valores Posibles |
|-------|------|-------------|------------------|
| **ID_BECA_SOLICITUD** | BIGINT | Identificador único de la solicitud | Generado por secuencia `GEN_BECA_SOLICITUD_ID` |
| **ID_BECA_PERIODO** | BIGINT | Periodo de becas al que pertenece | FK → `BECA_PERIODO.ID_BECA_PERIODO` |
| **FAMCOD** | VARCHAR(8) | Código de la familia solicitante | FK → `FAMILIA.FAMCOD` (ej: 'FAM001') |
| **FECHA_REG** | TIMESTAMP | Fecha de registro de la solicitud | Fecha/hora actual al crear (default: `CURRENT_DATE`) |
| **ESTADO** | SMALLINT | Estado actual de la solicitud | Ver tabla de estados abajo |

### Valores del Campo ESTADO

| Valor | Constante | Descripción | Cuándo se asigna |
|-------|-----------|-------------|------------------|
| **1** | ESTADO_SOLICITADO | Solicitud inicial | Al crear la solicitud (`procesoSolicitud`) |
| **2** | ESTADO_ACEPTADO | Aprobada con deuda | Al aprobar sin exonerar (`procesoAprobarSolicitud`, `exonerar=0`) |
| **3** | ESTADO_RECHAZADO | Rechazada | Al rechazar (`procesoUpdateEstado`) |
| **4** | ESTADO_PAGO | Con pagos registrados | Cuando se registra un pago en el sistema |
| **5** | ESTADO_EXP_PEN | Expediente pendiente | Al iniciar carga de documentos |
| **6** | ESTADO_EXP_COM | Expediente completo | Automático cuando todos los docs están subidos (`updateEstadosSol`) |
| **7** | ESTADO_EXP_VAL | Expediente validado | Automático cuando admin valida (`updateEstadosSol`) |
| **8** | ESTADO_RESOLUCION | En resolución | Al emitir resolución final |
| **9** | ESTADO_EXONERADO | Aprobado sin deuda | Al aprobar con exoneración (`procesoAprobarSolicitud`, `exonerar≠0`) |
| **10** | ESTADO_ESTUDIANTE_AGREGADO | Hijo agregado | Al agregar estudiante posterior (`agregaEstudiante=true`) |

---

## 📊 10 Estados del Proceso

| Estado | Nombre | Descripción |
|--------|--------|-------------|
| 1 | SOLICITADO | Solicitud inicial creada |
| 2 | ACEPTADO | Aprobada con generación de deuda |
| 3 | RECHAZADO | Solicitud rechazada |
| 4 | PAGO | Con pagos registrados |
| 5 | EXP_PEN | Expediente pendiente de documentos |
| 6 | EXP_COM | Expediente completo |
| 7 | EXP_VAL | Expediente validado |
| 8 | RESOLUCION | En resolución final |
| 9 | EXONERADO | Aprobado sin generar deuda |
| 10 | ESTUDIANTE_AGREGADO | Hijo agregado posteriormente |

---

## ✅ Requisitos para Solicitar Beca

### Colegio '0057' (Más Restrictivo)
- ✓ Antigüedad: **Mínimo 4 años**
- ✓ Hijos: **Más de 1 hijo activo**
- ✓ Historial: **Menos de 18 meses de beca previa**

### Colegio '0010'
- ✓ Permanencia: **Mínimo 2 años**
- ✓ Hijos: **Máximo 2 hijos**

### Todos los Colegios
- ✓ **Sin solicitud previa** en periodo activo
- ✓ **Sin deudas pendientes** (colegios configurados)
- ✓ **Periodo activo** disponible

---

## 🔄 Proceso de Aprobación

### 1. Validaciones
- Al menos 1 estudiante seleccionado
- Periodo vigente activo
- Documentos configurados

### 2. Dos Modalidades

#### Modalidad Normal (`exonerar = 0`)
- Estado: **ACEPTADO**
- ✅ Genera deuda automática (concepto BECA = 3)
- ✅ Asigna documentos familiares e individuales
- ✅ Genera ficha económica (colegios especiales)
- ✅ Asigna encuesta (colegios '0193', '0081')

#### Modalidad Exonerada (`exonerar ≠ 0`)
- Estado: **EXONERADO**
- ❌ NO genera deuda
- ✅ Asigna documentos
- ✅ Procesos especiales según colegio

---

## 🗑️ Eliminación de Solicitudes

### ❌ NO se puede eliminar si:
1. Tiene pagos registrados (Estado ≥ 4, excepto EXONERADO)
2. Tiene deuda generada (Estado = ACEPTADO, sin flag)

### ✅ Proceso de eliminación:
Elimina en cascada:
1. Documentos asignados
2. Participantes
3. Historial de estados
4. Solicitud

---

## 🔄 Automatizaciones

### Actualización de Estados
- **EXP_PEN → EXP_COM:** Cuando expediente está completo
- **EXP_COM → EXP_VAL:** Cuando expediente es validado

### Sincronización de Deudas
- Genera deudas faltantes para participantes aprobados

### Sincronización de Documentos
- Asigna documentos nuevos a solicitudes existentes

---

## 👨‍👩‍👧‍👦 Agregar Estudiante Posterior

### Diferencias clave:
- ❌ NO asigna documentos familiares
- ❌ NO genera ficha económica
- ✅ Estado: ESTUDIANTE_AGREGADO
- ✅ Genera deuda individual (si no exonerado)

---

## 📋 Tipos de Documentos

| Tipo | Nombre | Asignación |
|------|--------|------------|
| 1 | Familiar | Uno por familia |
| 2 | Individual | Uno por alumno |

---

## 🏫 Configuraciones Especiales por Colegio

### '0057', '0193', '0081'
- ✅ Generan ficha económica automática

### '0193', '0081'
- ✅ Asignan encuesta automática
  - '0193' → Formulario 194
  - '0081' → Formulario 72

---

## 🚫 Estados de Alumno Excluidos

No se consideran para becas:
- **F:** Finalizado (graduado)
- **R:** Retirado
- **E:** Egresado
- **T:** Trasladado
- **D:** Desactivado

---

## 🔑 Conceptos Clave

### Concepto de Cobro BECA
- **Código:** 3
- **Uso:** Generar deuda por beca en sistema de pensiones

### Antigüedad
- **Cálculo:** Año actual - Año de ingreso de la familia

### Historial de Becas
- **Límite:** 18 meses acumulados (≈2 años)
- **Solo aplica:** Colegio '0057'

---

## 📈 Flujo Típico

```
1. Familia solicita beca (SOLICITADO)
   ↓
2. Administrador aprueba (ACEPTADO/EXONERADO)
   ↓ (se genera deuda automática si no exonerado)
   ↓ (se asignan documentos)
   ↓ (se genera ficha económica)
   ↓
5. Familia sube documentos (EXP_PEN)
   ↓
6. Documentos completos (EXP_COM - automático)
   ↓
7. Administrador valida (EXP_VAL - automático)
   ↓
8. Resolución final (RESOLUCION)
```

---

## ⚠️ Validaciones Críticas

| Momento | Validación | Error si falla |
|---------|------------|----------------|
| Crear | Antigüedad | "No cumple requisito de antigüedad" |
| Crear | Cantidad hijos | "No cumple requisito de hijos" |
| Crear | Historial becas | "Ha gozado de beca por 2 años" |
| Crear | Deudas | "Existen X deudas pendientes" |
| Crear | Duplicado | "Ya tiene solicitud registrada" |
| Aprobar | Sin estudiantes | "No hay estudiantes seleccionados" |
| Aprobar | Sin periodo | "No existe periodo vigente" |
| Aprobar | Sin documentos | "No hay documentos para asignar" |
| Eliminar | Con pagos | "Existen pagos registrados" |
| Eliminar | Con deuda | "Debe eliminar desde Pensiones" |

---

## 💡 Puntos Importantes

1. **Todo es transaccional:** Garantiza integridad de datos
2. **Historial completo:** Cada cambio de estado se registra
3. **Reglas por colegio:** Validaciones varían según institución
4. **Documentos automáticos:** Se asignan según configuración
5. **Deuda condicional:** Solo si no es exonerado
6. **Sincronización:** Procesos para regularizar datos
7. **Flexibilidad:** Permite agregar estudiantes después
8. **Integración:** Conecta con pensiones, formularios y fichas

---

## 🎓 Casos de Uso Comunes

### Caso 1: Familia Nueva Solicita Beca
1. Valida requisitos (antigüedad, hijos, deudas)
2. Crea solicitud en estado SOLICITADO
3. Administrador revisa y aprueba
4. Sistema genera deuda automática
5. Familia completa expediente
6. Administrador valida documentos
7. Emite resolución

### Caso 2: Agregar Hijo a Familia Aprobada
1. Familia ya tiene solicitud ACEPTADA
2. Administrador usa `agregaEstudiante = true`
3. Sistema agrega participante
4. Asigna solo documentos individuales
5. Genera deuda solo para nuevo hijo
6. NO repite procesos familiares

### Caso 3: Exoneración de Deuda
1. Familia solicita beca
2. Administrador aprueba con `exonerar ≠ 0`
3. Estado: EXONERADO
4. NO se genera deuda
5. Resto del proceso normal

---

## 📞 Integraciones

- **Sistema de Pensiones:** Generación de deudas (SP_CREAR_DEUDA_SERVICIO)
- **Fichas Económicas:** Apertura automática (sp_aperturar_ficha_economica)
- **Formularios:** Asignación de encuestas (FRM_HISTORIA_FORMULARIO)
- **Expedientes:** Validación de documentos (BECA_EXPEDIENTE)
