# Plan de Implementación: Sistema POS — Estado Actualizado

## Resumen del Progreso

| Sprint | Estado | Descripción |
|--------|--------|-------------|
| Sprint 1 | ✅ Completo | Fundación: BD, inventario, API base |
| Sprint 2 | ✅ Completo | Auth JWT, asistencia, Python emails |
| Sprint 3 | ✅ Completo | Punto de Venta POS, ventas, alertas de stock |
| Sprint 4 | ✅ Completo | Dashboard del Dueño, Tasa de Cambio + Cierre Diario Automático |

---

## Stack Tecnológico Implementado

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | React + Vite | ✅ Funcionando en puerto 5173 |
| Backend API | Node.js + Express | ✅ Funcionando en puerto 5000 |
| Base de Datos | SQLite (via `sqlite3`) | ✅ Archivo `pos_database.sqlite` |
| Automatización | Python 3 + `smtplib` | ✅ Scripts funcionales |
| Seguridad | JWT (`jsonwebtoken`) + `bcryptjs` | ✅ Implementado |

---

## Endpoints de la API (Documentación Completa)

### Autenticación (`/api/auth`)
| Ruta | Método | Auth | Body | Descripción |
|------|--------|------|------|-------------|
| `/api/auth/register` | POST | No | `{name, email, password, role}` | Crear usuario |
| `/api/auth/login` | POST | No | `{email, password}` | Login — devuelve `token` |

### Categorías (`/api/categories`)
| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/categories` | GET | No | Listar todas |
| `/api/categories` | POST | No | Crear (`{name, description}`) |
| `/api/categories/:id` | DELETE | No | Eliminar |

### Productos (`/api/products`)
| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/products` | GET | No | Listar con JOIN de categoría |
| `/api/products` | POST | No | Crear producto |
| `/api/products/:id` | DELETE | No | Eliminar producto |

> [!TIP]
> Para el Sprint 4, se deberán proteger con `verifyToken` los endpoints de productos y categorías.

### Asistencia (`/api/attendance`)
| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/attendance/clock-in` | POST | **Sí (JWT)** | Registrar entrada del día |
| `/api/attendance/clock-out` | POST | **Sí (JWT)** | Registrar salida del día |

### Ventas (`/api/sales`)
| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/sales` | POST | **Sí (JWT)** | Procesar venta completa |
| `/api/sales/today` | GET | **Sí (JWT)** | Ventas del día actual |

---

## Tablas de Base de Datos (Esquema Final hasta Sprint 3)

```sql
-- Usuarios del sistema
users (id, name, email, password_hash, role, created_at)

-- Registro de asistencia
attendance (id, user_id, clock_in, clock_out, date)

-- Categorías de productos
categories (id, name, description)

-- Catálogo de productos
products (id, name, category_id, sku, barcode, unit_type, cost_price,
          selling_price, current_stock, min_stock_level, last_sold_at,
          created_at, updated_at)

-- Cabecera de cada venta
sales (id, user_id, total_revenue, total_cost, gross_profit, created_at)

-- Detalle de los ítems de cada venta
sale_items (id, sale_id, product_id, quantity, unit_price, unit_cost, subtotal)
```

---

## Sprint 4: Dashboard del Dueño — Plan Detallado

### Objetivo
Crear el módulo de administración que le da al dueño visibilidad completa del negocio, con la lógica de ganancia real, cierre de caja y reportes.

### Cambios en Backend

#### [MODIFY] db.js
Agregar tabla `daily_closures`:
```sql
daily_closures (id, date UNIQUE, total_revenue, total_cost,
                gross_profit, suggested_withdrawal, suggested_reinvestment)
```

#### [NEW] dashboardController.js
- `getDailyReport()`: Agrega ventas del día y calcula ganancia bruta.
- `getStagnantProducts()`: Productos sin ventas en los últimos N días (`last_sold_at`).
- `getReplenishmentList()`: Productos con `current_stock <= min_stock_level`.
- `performDailyClosure()`: Guarda el cierre en `daily_closures` y calcula sugerencias (80% reinversión / 20% retiro).

#### [NEW] dashboardRoutes.js
```
GET  /api/dashboard/report        → Reporte del día en tiempo real
POST /api/dashboard/close-day     → Ejecutar cierre oficial
GET  /api/dashboard/stagnant      → Productos estancados
GET  /api/dashboard/replenishment → Lista de reposición
```

#### [NEW] automation/scripts/daily_closure.py
Script Python que se puede programar con el Planificador de Windows para ejecutarse automáticamente a las 11 PM todos los días. Llama a la API de cierre y envía el reporte por email.

### Cambios en Frontend

#### [NEW] Dashboard.jsx
Panel con 4 secciones:
1. **KPIs del Día**: Ingresos, Costo, Ganancia Bruta, Número de Ventas.
2. **Sugerencia de Retiro**: Barra visual mostrando % retiro vs % reinversión.
3. **Productos a Reponer**: Lista roja de productos bajo mínimo.
4. **Productos Estancados**: Lista de productos sin movimiento.

---

## Archivos de Configuración que el Usuario Debe Editar

> [!IMPORTANT]
> Antes de desplegar o compartir el proyecto, edita estos archivos:

1. **[automation/.env](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/automation/.env)** — Credenciales de correo Gmail para las notificaciones automáticas.
2. **[backend/server.js](file:///C:/Users/joan2/.gemini/antigravity-ide/scratch/pos-system/backend/server.js)** — Cambia `JWT_SECRET` en `authController.js` por una cadena larga y aleatoria en producción.

## Credenciales de Prueba
- **URL del Sistema:** http://localhost:5173
- **Admin Email:** `admin@pos.com`
- **Admin Password:** `123456`
