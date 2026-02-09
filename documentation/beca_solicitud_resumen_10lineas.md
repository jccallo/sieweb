# BECA_SOLICITUD - Resumen en 10 Líneas

1. **Tabla de solicitudes de becas** con 5 campos: ID (secuencia), ID_PERIODO (FK), FAMCOD (FK), FECHA_REG (timestamp), ESTADO (1-10).

2. **Una solicitud por familia por periodo** - Validación obligatoria al crear.

3. **Campo ESTADO (10 valores):** 1=SOLICITADO (inicial), 2=ACEPTADO (con deuda), 3=RECHAZADO, 4=PAGO (con pagos), 5=EXP_PEN (docs pendientes), 6=EXP_COM (docs completos), 7=EXP_VAL (docs validados), 8=RESOLUCION, 9=EXONERADO (sin deuda), 10=ESTUDIANTE_AGREGADO (hijo posterior).

4. **Requisitos por colegio:** '0057' requiere 4+ años antigüedad y 2+ hijos; '0010' requiere 2+ años y máx. 2 hijos.

5. **Aprobación genera deuda automática** (concepto BECA=3) si `exonerar=0` (estado 2), sino estado 9 sin deuda.

6. **Estados automáticos:** 5→6 cuando documentos completos, 6→7 cuando validados por admin.

7. **No se puede eliminar** si tiene pagos (estado≥4 excepto 9) o deuda generada (estado=2).

8. **Documentos automáticos:** Familiares (DOC_GRUPAL=1) uno por familia, Individuales (DOC_GRUPAL=2) uno por alumno.

9. **Procesos especiales:** Colegios '0057','0193','0081' generan ficha económica; '0193','0081' asignan encuesta.

10. **Historial obligatorio:** Cada cambio de estado se registra en BECA_ESTADO_FECHA con usuario y fecha.
