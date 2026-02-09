# Campo ESTADO de la Tabla ALUMNO

## 📊 Valores Completos del Campo `ESTADO`

| Código | Descripción | Significado |
|--------|-------------|-------------|
| **V** | EN ESTUDIO | Alumno vigente/activo estudiando |
| **P** | PROMOVIDO | Alumno promovido al siguiente grado |
| **S** | REQ.RECUPERACION | Requiere recuperación académica |
| **E** | EX-ALUMNO | Egresado del colegio |
| **R** | RETIRADO | Retirado del colegio |
| **T** | TRASLADADO | Trasladado a otro colegio |
| **D** | DESACTIVADO | Dado de baja/inactivo |
| **F** | FINALIZADO | Completó sus estudios |

---

## ✅ Estados Activos (para Becas y Procesos)

Los siguientes estados se consideran **activos** para procesos como becas, conteo de hijos, etc.:

- **V** - EN ESTUDIO
- **P** - PROMOVIDO
- **S** - REQ.RECUPERACION

---

## ❌ Estados Excluidos (Inactivos)

Los siguientes estados se excluyen de procesos activos:

- **E** - EX-ALUMNO
- **R** - RETIRADO
- **T** - TRASLADADO
- **D** - DESACTIVADO
- **F** - FINALIZADO

---

## 🔍 Uso en el Código

### Filtro para Alumnos Activos

```javascript
knex('ALUMNO')
    .where('MATRICULA', 'S')
    .whereNotIn('ESTADO', ['F', 'R', 'E', 'T', 'D'])
```

Este filtro obtiene solo alumnos que:
1. Tienen matrícula activa (`MATRICULA = 'S'`)
2. Están en estados activos (V, P, S)

---

## 📍 Definición en el Código

**Archivo:** `d:\sieweb\siewebjs\common\models\exportExcel.js` (líneas 38-44)

```javascript
case
  when ALU.ESTADO = 'V' then 'EN ESTUDIO'
  when ALU.ESTADO = 'R' then 'RETIRADO'
  when ALU.ESTADO = 'T' then 'TRANSLADADO'
  when ALU.ESTADO = 'E' then 'EX-ALUMNO'
  when ALU.ESTADO = 'P' then 'PROMOVIDO'
  when ALU.ESTADO = 'S' then 'REQ.RECUPERACION'
end) as ESTADO_ALUMNO
```

**Constante:** `d:\sieweb\siewebjs\application\business\core\Constants.js` (línea 4103)

```javascript
static get ESTADO_ALUMNO_VIGENTE() {
    return 'V'
}
```
