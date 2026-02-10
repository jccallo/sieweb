# PERCOB - Periodo de Cobro

## Definición

`PERCOB` es un campo de la tabla `CALENDAR` que indica el **tipo de periodo** al que pertenece un cobro.

## Valores Posibles

| Valor | Constante | Descripción | Uso Típico |
|-------|-----------|-------------|------------|
| **'P'** | PERMANENTE | Cobros permanentes/regulares | Pensiones mensuales, cuotas escolares regulares |
| **'I'** | INICIAL | Cobros iniciales | Matrícula, cuota de ingreso, uniformes |
| **'E'** | EVENTUAL | Cobros eventuales/especiales | **Becas**, eventos especiales, servicios extraordinarios |
| **'T'** | TALLERES | Cobros de talleres | Talleres extracurriculares, cursos adicionales |

## Ubicación en el Código

### Backend (Node.js)
```javascript
// d:\sieweb\siewebjs\application\business\core\Constants.js
static get PERIODO_CALENDARIO() {
  return {
    INICIAL: 'I',
    PERMANENTE: 'P',
    TALLERES: 'T'
  }
}
```

### Frontend (Quasar)
```javascript
// d:\sieweb\quasar\src\utils\constantesTesoreria.js
Constantes.PERIODO_COBRO = {
  PERMANENTE: 'P',
  INICIAL: 'I',
  EVENTUAL: 'E',
  TALLERES: 'T'
}
```

## Uso en Stored Procedures

### SP_CREAR_DEUDA_SERVICIO (Becas)
```sql
SELECT TC.ID_TIPOCOBRO, C.ANOCAL, C.CONCOB, ...
FROM CALENDAR C
WHERE C.ANOCAL = :P_ANOCOB 
  AND C.PERCOB = 'E'  -- ← Filtra por EVENTUAL (becas)
  AND TC.ID_TIPOCOBRO = :P_SERVICIO
```

## Ejemplo de Configuración para Becas

```sql
-- Cuota 1 - Marzo (Beca)
INSERT INTO CALENDAR (ANOCAL, CONCOB, MESCAL, FECEMI, FECVEN, MONCOD, MONTO, PERCOB)
VALUES (2026, '010', '03', '2026-03-01', '2026-03-15', 'PEN', 150.00, 'E');

-- Cuota 2 - Junio (Beca)
INSERT INTO CALENDAR (ANOCAL, CONCOB, MESCAL, FECEMI, FECVEN, MONCOD, MONTO, PERCOB)
VALUES (2026, '011', '06', '2026-06-01', '2026-06-15', 'PEN', 150.00, 'E');
```

## Diferencia con Pensiones Regulares

| Aspecto | Pensiones Regulares | Becas |
|---------|---------------------|-------|
| PERCOB | `'P'` (Permanente) | `'E'` (Eventual) |
| Frecuencia | Mensual, todo el año | Según calendario específico |
| Monto | Estándar para todos | Puede variar según % de beca |
| Tipo de Cobro | ID_TIPOCOBRO = 1 | ID_TIPOCOBRO = 3 |

## Notas Importantes

- El campo `PERCOB` es **obligatorio** en la tabla `CALENDAR`
- El stored procedure `SP_CREAR_DEUDA_SERVICIO` **solo** crea deudas si encuentra registros con el `PERCOB` correcto
- Para becas, **siempre** usar `PERCOB = 'E'` (EVENTUAL)
