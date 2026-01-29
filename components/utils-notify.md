# Documentación: `utils/notify.js`

Esta utilidad es un wrapper personalizado sobre el plugin **Notify** de Quasar. Simplifica el envío de mensajes al usuario estandarizando colores, iconos y posiciones.

## 1. Funcionamiento Básico

La función acepta tres parámetros: `mensaje`, `tipo` (opcional) y `configuración extra` (opcional).

```javascript
import notify from 'utils/notify'

// Notificación de éxito (default)
notify('Operación realizada con éxito')

// Notificación de error
notify('Hubo un problema al guardar', 'error')

// para usarse en la mayoria de casos
notify('Datos guardados correctamente', 'positive')
notify('Su sesión expirará pronto', 'info')
notify('Este registro ya existe', 'warning')
notify('Error fatal: El archivo es demasiado grande', 'negative')
```

---

## 2. Tipos de Notificaciones (Presets)

| Tipo (`type`) | Color | Icono | Descripción |
| :--- | :--- | :--- | :--- |
| `'success'` / `'positive'` | `positive` (verde) | `check_circle` | Para acciones completadas. |
| `'error'` | `warning` (ámbar) | `warning` | Para errores controlados o validaciones. |
| `'question'` | `info` (azul) | `help` | Para mensajes de ayuda o duda. |
| `'info'` | `info` (azul) | `info` | Para información general. |

> [!NOTE]
> Si pasas cualquier otro valor (ej: `'negative'`), se usará como el `type` nativo de Quasar.

---

## 3. Configuración Avanzada (`extConfig`)

Puedes pasar un tercer objeto para sobrescribir cualquier propiedad de Quasar Notify.

### Ejemplos

**Cambiar posición y tiempo:**

```javascript
notify('Mensaje persistente', 'info', {
  timeout: 0, // No se cierra solo
  position: 'center'
})
```

**Agregar botones de acción:**

```javascript
notify('¿Borrar archivo?', 'question', {
  actions: [
    { label: 'Sí, borrar', color: 'white', handler: () => eliminar() },
    { label: 'Cancelar', color: 'yellow' }
  ]
})
```

---

## 4. Características Especiales

1. **Responsive**: La notificación cambia de posición automáticamente. En móviles aparece abajo (`bottom`) y en escritorio arriba a la derecha (`top-right`).
2. **Botón de cierre**: Todas las notificaciones incluyen por defecto un botón `x` para cerrarlas manualmente.
3. **Prioridad**: Si pasas un objeto en `extConfig`, este tiene prioridad sobre los valores automáticos de la función.

