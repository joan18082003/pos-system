# Walkthrough del Proyecto: Sistema POS
## Sprints 1, 2 y 3 — Estado Actual

---

> [!NOTE]
> Este documento resume **exactamente qué se hizo, por qué y en qué archivo**. Es tu guía de referencia para poder retomar y editar el código en cualquier momento.

---

## Estructura General del Proyecto

```
pos-system/
├── backend/            → Servidor Node.js + Express (API REST)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                    ← Conexión SQLite + creación de tablas
│   │   ├── controllers/
│   │   │   ├── authController.js        ← Login y Registro
│   │   │   ├── attendanceController.js  ← Marcar entrada/salida
│   │   │   ├── categoryController.js    ← CRUD de Categorías
│   │   │   ├── productController.js     ← CRUD de Productos
│   │   │   └── salesController.js       ← Procesar ventas y descontar stock
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js        ← Guardia JWT (protege rutas)
│   │   └── routes/
│   │       ├── authRoutes.js            ← POST /api/auth/login|register
│   │       ├── attendanceRoutes.js      ← POST /api/attendance/clock-in|clock-out
│   │       ├── categoryRoutes.js        ← GET|POST|DELETE /api/categories
│   │       ├── productRoutes.js         ← GET|POST|DELETE /api/products
│   │       └── salesRoutes.js           ← POST /api/sales | GET /api/sales/today
│   ├── server.js                        ← Punto de entrada del servidor
│   ├── seed.js                          ← Carga categorías iniciales
│   ├── seed_users.js                    ← Crea usuario admin inicial
│   └── pos_database.sqlite              ← Archivo físico de la base de datos
│
├── frontend/           → React + Vite (Interfaz de usuario)
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx          ← Estado global de sesión (user + token)
│       ├── components/
│       │   └── Navbar.jsx               ← Barra lateral de navegación
│       ├── pages/
│       │   ├── Login.jsx                ← Pantalla de inicio de sesión
│       │   ├── Inventory.jsx            ← Gestión de inventario (CRUD)
│       │   ├── Attendance.jsx           ← Módulo de asistencia con reloj
│       │   └── POS.jsx                  ← Punto de Venta (catálogo + carrito)
│       ├── services/
│       │   └── api.js                   ← Funciones fetch() al backend
│       ├── App.jsx                      ← Enrutador principal de la app
│       └── index.css                    ← Sistema de diseño (variables + clases)
│
└── automation/         → Scripts Python de automatización
    ├── scripts/
    │   ├── attendance_notifier.py       ← Email al dueño al marcar asistencia
    │   └── inventory_alerts.py          ← Email al dueño si hay bajo stock
    ├── .env                             ← Credenciales de correo (EDITAR ESTO)
    └── requirements.txt                 → python-dotenv
```

---

## Sprint 1: Fundación, Base de Datos e Inventario

### Qué se construyó

**Base de Datos SQLite** — [db.js](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/backend/src/config/db.js)

Se definieron las primeras 2 tablas operativas:
- **`categories`**: id, name, description
- **`products`**: id, name, category_id, sku, barcode, `unit_type` ('unit' | 'weight'), `cost_price`, `selling_price`, `current_stock`, `min_stock_level`, `last_sold_at`

> [!IMPORTANT]
> El campo `unit_type` es el que diferencia si un producto se vende por unidad entera (ej. bolsa de arroz) o por peso/fracción (ej. jamón al corte). Esta distinción es crítica para el POS.

**API REST del Inventario**

| Ruta | Método | Descripción |
|---|---|---|
| `/api/categories` | GET | Lista todas las categorías |
| `/api/categories` | POST | Crea una categoría |
| `/api/categories/:id` | DELETE | Elimina una categoría |
| `/api/products` | GET | Lista productos con su categoría (JOIN) |
| `/api/products` | POST | Crea un producto nuevo |
| `/api/products/:id` | DELETE | Elimina un producto |

**Frontend: Página de Inventario** — [Inventory.jsx](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/frontend/src/pages/Inventory.jsx)

- Formulario de dos columnas para registrar productos.
- Tabla responsiva que lista todos los productos con su categoría.
- Hook `useEffect` para cargar datos al montar el componente.
- Hook `useState` para manejar el formulario y los datos.

**Sistema de Diseño** — [index.css](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/frontend/src/index.css)

Clases reutilizables: `.card`, `.btn`, `.btn-primary`, `.btn-danger`, `.form-input`, `.table-container`, etc.

---

## Sprint 2: Autenticación, Asistencia y Automatización

### Qué se construyó

**Nuevas tablas en la BD** — [db.js](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/backend/src/config/db.js)

- **`users`**: id, name, email, `password_hash`, role ('admin' | 'cashier')
- **`attendance`**: id, user_id, clock_in, clock_out, date

**Sistema de Autenticación JWT**

- [authController.js](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/backend/src/controllers/authController.js): `register()` encripta la contraseña con `bcryptjs` antes de guardar. `login()` compara el hash y devuelve un token JWT que expira en 12 horas.
- [authMiddleware.js](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/backend/src/middlewares/authMiddleware.js): Función `verifyToken` que actúa como guardia — cualquier ruta que la use requiere un token válido en el header `Authorization: Bearer <token>`.

**Módulo de Asistencia** — [attendanceController.js](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/backend/src/controllers/attendanceController.js)

- `clockIn`: Verifica que no haya marcado hoy, inserta el registro y llama a Python.
- `clockOut`: Actualiza el registro del día (solo si `clock_out` es NULL) y llama a Python.
- Ambas rutas están protegidas por `verifyToken`.

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/auth/register` | POST | No | Crear usuario |
| `/api/auth/login` | POST | No | Iniciar sesión |
| `/api/attendance/clock-in` | POST | Sí | Marcar entrada |
| `/api/attendance/clock-out` | POST | Sí | Marcar salida |

**Frontend: Login + Navbar + Asistencia**

- [AuthContext.jsx](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/frontend/src/context/AuthContext.jsx): Guarda `user` y `token` en `localStorage`. Expone `login()` y `logout()` y el hook `useAuth()`.
- [Login.jsx](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/frontend/src/pages/Login.jsx): Pantalla con gradiente azul marino, validación de errores y llamada al backend.
- [Navbar.jsx](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/frontend/src/components/Navbar.jsx): Barra lateral fija, menú de 4 módulos, avatar del usuario y logout.
- [Attendance.jsx](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/frontend/src/pages/Attendance.jsx): Reloj en tiempo real (`setInterval`), botones grandes de entrada/salida con feedback visual.

**Automatización Python** — [attendance_notifier.py](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/automation/scripts/attendance_notifier.py)

- Recibe `--name`, `--event` y `--time` por línea de comandos (args).
- Envía email HTML elegante al dueño via SMTP (Gmail).
- Lanzado desde Node.js con `child_process.spawn()` de forma no bloqueante.

> [!IMPORTANT]
> **Para activar los emails:** edita [automation/.env](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/automation/.env) con tu correo Gmail y una "Contraseña de Aplicación" de 16 dígitos de Google. Nunca uses tu contraseña real.

**Credenciales de prueba disponibles:**
- Email: `admin@pos.com`
- Contraseña: `123456`

---

## Sprint 3: Punto de Venta (POS)

### Qué se construyó

**Nuevas tablas en la BD** — [db.js](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/backend/src/config/db.js)

- **`sales`**: id, user_id, total_revenue, total_cost, gross_profit, created_at
- **`sale_items`**: id, sale_id, product_id, quantity, unit_price, unit_cost, subtotal

> [!NOTE]
> Se guardan tanto el precio de venta como el costo en el momento de la venta. Esto garantiza que el cálculo de ganancia sea históricamente correcto, incluso si los precios cambian después.

**API de Ventas** — [salesController.js](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/backend/src/controllers/salesController.js)

`createSale()` hace 4 cosas en orden:
1. Calcula `total_revenue`, `total_cost` y `gross_profit`.
2. Inserta el registro general en `sales`.
3. Inserta el detalle de cada producto en `sale_items`.
4. Descuenta el stock (`current_stock - quantity`) y verifica si hay alerta.

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/sales` | POST | Sí | Procesa una venta completa |
| `/api/sales/today` | GET | Sí | Historial de ventas del día |

**Script de Alertas** — [inventory_alerts.py](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/automation/scripts/inventory_alerts.py)

Enviado automáticamente desde Node.js después de cada venta si el stock de cualquier producto cae al mínimo o se agota. Envía un email HTML con nivel crítico (rojo) o advertencia (amarillo).

**Frontend: Pantalla POS** — [POS.jsx](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/frontend/src/pages/POS.jsx)

Divide la pantalla en dos paneles:

**Panel izquierdo (Catálogo):**
- Búsqueda en tiempo real por nombre o SKU.
- Grid responsivo de tarjetas de productos.
- Soporte de dos tipos: botón "Agregar" directo para unidades, input de peso + botón para productos por peso.
- Stock en rojo cuando está bajo el mínimo.

**Panel derecho (Carrito):**
- Lista de items con control de cantidad (+ / −) para unidades.
- Total, costo y ganancia estimada en tiempo real.
- Botón "Cobrar y Finalizar" que llama al backend.
- Modal de recibo con el desglose: ingresos, costos y ganancia bruta.

---

## Cómo Iniciar el Sistema

Necesitas abrir **2 terminales**:

**Terminal 1 — Backend:**
```bash
cd pos-system/backend
npm start
# Servidor corriendo en http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd pos-system/frontend
npm run dev
# Interfaz en http://localhost:5173
```

**Para los scripts Python** (una sola vez, para instalar dependencias):
```bash
cd pos-system/automation
pip install -r requirements.txt
```

---

## Sprint 4: Dashboard del Dueño, Tasa de Cambio y Cierre Diario (✅ COMPLETO)

### Qué se construyó

**Backend: Módulo de Dashboard y Cierre** — [dashboardController.js](file:///c:/pos-system/backend/src/controllers/dashboardController.js)
- `getDailyReport`: Agrupa ventas del día y calcula Ingresos, Costos, Ganancia Bruta y total de ventas.
- `getStagnantProducts`: Filtra productos sin ventas en los últimos 7 días o nunca vendidos.
- `getReplenishmentList`: Filtra productos cuyo stock actual es menor o igual al mínimo.
- `performDailyClosure`: Registra el cierre diario oficial en `daily_closures` con distribución de ganancias (80% reinversión / 20% retiro) y desencadena automáticamente el reporte por email vía Python.
- `getSetting` / `updateSetting`: Almacena y recupera configuraciones dinámicas como la **Tasa de Cambio (Dólar / Bs)**.

**Frontend: Dashboard interactivo y Multimoneda** — [Dashboard.jsx](file:///c:/pos-system/frontend/src/pages/Dashboard.jsx)
- **Tasa de Cambio:** Permite al dueño establecer la tasa del día en bolívares.
- **KPIs Financieros Duales:** Muestra montos en USD y su equivalente en Bs. en tiempo real.
- **Acción de Cierre:** Botón con modal de confirmación y cálculo instantáneo de la distribución 80/20.
- **Tablas de Alertas:** Productos a reponer (rojo) y productos estancados (naranja).

**Automatización de Cierre** — [daily_closure.py](file:///c:/pos-system/automation/scripts/daily_closure.py)
- Script Python ejecutable de forma autónoma o desde el backend.
- Autentica contra la API, procesa el cierre y envía un correo HTML con diseño profesional al dueño con el balance completo del día.

---

## 🏆 Proyecto Finalizado

El sistema POS se encuentra totalmente operativo y funcional listo para producción.
