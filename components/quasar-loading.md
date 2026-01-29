# Documentación: Quasar Loading Plugin (`this.$q.loading`)

El plugin **Loading** de Quasar se utiliza para mostrar una capa de superposición (overlay) con un spinner que bloquea la interacción del usuario durante procesos asíncronos o pesados.

## 1. Métodos Principales

### `show(options)`

Activa la capa de carga. Acepta un objeto de configuración opcional:

* **`message`**: Texto a mostrar (ej: `"Cargando..."`).
* **`spinnerColor`**: Color del icono cargando (ej: `'primary'`, `'warning'`).
* **`messageColor`**: Color del texto del mensaje.
* **`backgroundColor`**: Color del fondo de la capa (overlay).
* **`customClass`**: Clase CSS personalizada para estilos específicos.

### `hide()`

Oculta la pantalla de carga inmediatamente.

### `setDefaults(options)`

Configura los valores predeterminados para todas las llamadas a `.show()` en la aplicación.

---

## 2. Propiedades

### `isActive`

Devuelve un booleano (`true`/`false`) indicando si el cargador está visible actualmente.

```javascript
if (this.$q.loading.isActive) {
  console.log("El cargador está en pantalla");
}
```

---

## 3. Ejemplo de Implementación Recomendada

> [!IMPORTANT]
> **Regla de oro:** Siempre usa un bloque `finally` para asegurar que el cargador se oculte, incluso si ocurre un error inesperado.

```javascript
async ejecutarProceso() {
  // 1. Iniciar cargador
  this.$q.loading.show({
    message: 'Procesando, por favor espere...',
    spinnerColor: 'white'
  });

  try {
    const res = await peticionApi();
    // Manejar éxito
  } catch (error) {
    // Manejar error
    console.error(error);
  } finally {
    // 2. Ocultar cargador SIEMPRE al terminar
    this.$q.loading.hide();
  }
}
```
