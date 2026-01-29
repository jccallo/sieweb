# Documentación: El Objeto `req` en SiewebJS

Este documento explica cómo se inyectan datos en la petición (`req`) y cómo acceder a ellos desde los controladores en el framework SiewebJS.

## 1. Ciclo de Vida y Middlewares

A medida que una petición HTTP entra al servidor, varios middlewares "inyectan" propiedades en el objeto `req` antes de que llegue a tu controlador.

### Inyección Inicial (`bootstrap.js`)

- **`req.id`**: Un UUID v4 único generado para cada petición. Útil para rastrear logs y errores.
- **`req.cole`**: Identificador corto del colegio (ej. `bpastor`, `demo`). Se obtiene del subdominio o del header `x-forwarded-host`.
- **`req.nameCliente`**: Alias de `req.cole`.
- **`req.HyoCole`**: Objeto que contiene la configuración y el pool de conexiones a la base de datos del colegio específico.

### Autenticación (`confirmarToken.js`)

- **`req.usu`**: Este es el objeto **más importante**. Es el contenido decodificado del JWT enviado por el front-end. Suele traer:
  - `req.usu.USUCOD`: Código del usuario (ej. `JPEREZ`).
  - `req.usu.ANO`: Año escolar actual.
  - `req.usu.COLCOD`: Código numérico del colegio.
  - `req.usu.FAMCOD`: Código de familia (si aplica).

### Pre-procesamiento (`preHook.js`)

- **`req.query`**: El servidor recorre todos los parámetros GET y convierte los strings `"true"` o `"false"` en valores booleanos reales (`true`/`false`).

---

## 2. Acceso desde Controladores (`this.request`)

En los controladores de SiewebJS, no necesitas usar `req` directamente, ya que el framework mapea todo a **`this.request`**.

### Parámetros de Entrada

| Propiedad | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `this.request.query` | **GET** | Datos en la URL después del `?` | `?id=10&activo=true` |
| `this.request.body` | **POST** | Datos enviados en el cuerpo (JSON) | `{ "nombre": "Juan" }` |
| `this.request.params` | **Ruta** | Variables definidas en la ruta dinámica | `/api/Persona/:id` |

### Datos de Auditoría y Usuario

- **`this.request.id`**: El identificador único de la petición.
- **`this.request.usu`**: Datos del usuario autenticado (extraídos del token).
- **`this.request.cole`**: El nombre del colegio actual.

---

## 3. Ejemplo Práctico en un Controlador

```javascript
async addPersona() {
  // 1. Obtener quién hace la petición
  const usuario = this.request.usu.USUCOD;
  
  // 2. Obtener datos del formulario (POST)
  const datos = this.request.body;
  
  // 3. Obtener filtros de la URL (GET)
  const esTest = this.request.query.test; // Ya viene como boolean
  
  // 4. Identificar la petición en logs
  console.log(`Petición ${this.request.id} iniciada por ${usuario}`);
  
  return { success: true, requestId: this.request.id };
}
```

---

## 4. Estructura Final Estimada de `this.request`

Así es como se vería el objeto completo dentro de tu controlador después de pasar por todos los middlewares:

```javascript
{
  // Identificación y Rastreo (bootstrap.js)
  id: "550e8400-e29b-41d4-a716-446655440000", 
  cole: "bpastor",
  nameCliente: "bpastor",

  // Datos del Usuario Autenticado (confirmarToken.js)
  usu: {
    USUCOD: "JPEREZ",      // Usuario logueado
    ANO: 2024,             // Año de trabajo
    COLCOD: "0090",        // Código del colegio
    TIPCOD: "001",         // Tipo de usuario
    FAMCOD: null,          // Código de familia (si aplica)
    COOKIE: "N923..."      // Hash de sesión
  },

  // Conexión a Base de Datos (bootstrap.js -> cargarDb.js)
  HyoCole: {
    knex: {
      firebird4: '1',
      demo: undefined,
      nombre: 'clementealthaus',
      connection: {
        database: '/home/firebird/clementealthaus/SIEPERSONA.FDB',
        user: 'sysdba',
        port: 3050,
        role: undefined,
        blobAsText: true,
        host: '192.168.1.245'
      },
      dialect: 'firebird',
      pool: { min: 10, max: 150 },
      acquireConnectionTimeout: 60000,
      audit: {
        env: undefined,
        token: ['USUCOD', 'IP'],
        methods: ['insert', 'update', 'delete', ...],
        connection: { database: 'clementealthaus', collection: 'auditoria' }
      },
      client: [Function: Client_Firebird]
    },
    info: {
      colcod: '0020',
      colname: 'clementealthaus',
      colsunat: 'clementealthaus',
      webhost: 'http://proyectpg.hyo',
      url: 'http://clementealthaus.proyectpg.hyo',
      sistema: 'full',
      maildirect: 0,
      corporativo: []
    },
    navegarlocal: false
  },

  // Entrada de Datos (Procesado por BodyParser y PreHook)
  body: {                  // Datos de un POST
    id_persona: 123,
    observacion: "Nota de prueba"
  },
  query: {                 // Datos de la URL (?activo=true)
    activo: true,          // ¡Ya es booleano, no string!
    filtro: "todos"
  },
  params: {                // Variables de ruta (/api/Persona/:id)
    id: "123"
  },

  // Datos Originales de Express
  headers: { ... },        // Headers (User-Agent, etc.)
  method: "POST",
  originalUrl: "/api/intranet/Example/addPersona?activo=true"
}
```

> [!TIP]
> Si en algún momento tienes dudas de qué trae el objeto en tiempo real, siempre puedes hacer un `console.log(this.request)` en la primera línea de tu método de controlador.
