# Emergency Route Planner

Real-time web platform that finds the fastest and safest emergency routes for ambulances, fire engines and police vehicles, with live updates until the responder arrives.

## 📋 Project Overview

The Emergency Route Planner addresses the critical problem of dispatchers losing minutes in emergencies by providing:
- Real-time vehicle tracking and GPS streaming
- Intelligent route planning with OSRM and hazard avoidance
- Hospital capacity management with live updates
- Role-based access control for all emergency services
- Audit logging and analytics dashboard

## 🛠️ Technology Stack

### Frontend
- **React 18** + **Vite** - Fast development and build
- **React Router** - Client-side routing
- **Context API + useReducer** - State management
- **Axios** - API client
- **Tailwind CSS** - Utility-first styling with dark mode
- **React-Leaflet** - Interactive maps with OpenStreetMap tiles
- **Recharts** - Data visualization charts
- **react-hot-toast** - Toast notifications
- **react-i18next** - Internationalization (English, Hindi, Telugu)

### Backend
- **Node.js 20** + **Express.js** - API framework
- **Mongoose** - MongoDB ODM with 2dsphere geospatial indexes
- **Socket.IO** - Real-time bi-directional communication
- **JWT** - Access token + refresh token in httpOnly cookies
- **bcryptjs** - Password hashing
- **Joi** - Input validation
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting
- **express-mongo-sanitize** - NoSQL injection protection
- **Winston + Morgan** - Logging
- **Nodemailer** - Transactional email

### Routing & Infrastructure
- **OSRM** (Open Source Routing Machine) - Route planning with alternatives
- **MongoDB Atlas** - Cloud database with geospatial indexing
- **Docker** - Containerization
- **docker-compose** - Local development environment

### Testing
- **Jest** + **Supertest** - Backend API testing
- **React Testing Library** - Frontend component testing

## 🏗️ Architecture

```
Emergency Route Planner Architecture
├── Frontend (React + Vite)       → Port 5173
├── Backend (Node/Express)        → Port 4000
├── MongoDB Atlas                  → Port 27017
└── Socket.IO                      → Real-time rooms per incident/role/hospital
```

### Data Flow
1. Citizen presses SOS → Incident created with source/destination
2. Dispatcher assigns vehicle → Route calculated via OSRM
3. Driver receives assignment → GPS streams live on map
4. Hospital updates capacity → Routing decisions adapt
5. New hazard reported → Automatic route recalculation
6. Incident resolved → Capacity incremented, status flow completed

## 📦 Phase 1 - Foundation (Current)

Completed files and components:

### Backend Configuration
- `src/app.js` - Express app with middleware, security, routes
- `src/config/db.config.js` - MongoDB connection with 2dsphere support
- `src/config/constants.js` - Role enums, permissions, emergency priorities
- `.env.example` - Environment variable template

### Database Models (with indexes)
- `src/models/User.model.js` - RBAC roles, geolocation, JWT methods
- `src/models/Incident.model.js` - CRUD, status flow, geospatial
- `src/models/EmergencyType.model.js` - Priority mappings, vehicle/hospital requirements
- `src/models/Vehicle.model.js` - GPS tracking, status management
- `src/models/Facility.model.js` - Hospitals, fire stations, police stations with capacity
- `src/models/Hazard.model.js` - Road blocks, construction, active zone tracking

### Authentication & RBAC
- `src/services/auth.service.js` - Register, login, refresh, logout, forgot/reset password
- `src/middleware/auth.middleware.js` - JWT verification, role-based permissions
- `src/middleware/validator.middleware.js` - Joi validation on every endpoint
- `src/middleware/error.middleware.js` - Consistent error format, Winston logging

### API Routes
- `src/routes/auth.routes.js` - Public: register, login, logout, refresh, forgot/reset password
- `src/routes/incident.routes.js` - CRUD with search/filter/sort/pagination, status flow, assignment, re-route
- `src/routes/emergencyType.routes.js` - CRUD for emergency type definitions
- `src/routes/vehicle.routes.js` - GPS status updates, vehicle management
- `src/routes/facility.routes.js` - Hospital capacity updates, facility management
- `src/routes/hazard.routes.js` - Road block reporting, hazard lookup
- `src/routes/hospital.routes.js` - Patient acceptance, capacity management
- `src/routes/dashboard.routes.js` - Analytics, metrics, heatmap, busiest areas
- `src/routes/user.routes.js` - Admin user management

### Services (Business Logic)
- `src/services/auth.service.js` - Authentication business logic
- `src/services/routing.service.js` - OSRM wrapper with caching, hazard avoidance, fallback
- `src/services/nearestFacility.service.js` - MongoDB $geoNear search
- `src/services/hospitalCapacity.service.js` - Live bed/ICU/oxygen updates
- `src/services/audit.service.js` - Create/update/delete/assignment audit logging

### Utilities
- `src/utils/response.js` - Consistent success/error response formats
- `src/utils/mapUtils.js` - Coordinate helpers, haversine distance

## 🚀 Quick Start - Local Development

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Docker (optional, for containerized setup)

### Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd emergency-route-planner
   npm install
   ```

2. **Environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your values (JWT secrets, MongoDB URI, etc.)
   ```

3. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod

   # Or Docker
   docker-compose up -d db
   ```

4. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Or with Docker Compose
   docker-compose up
   ```

5. **Access the application**
   - API: http://localhost:4000
   - Health check: http://localhost:4000/health
   - Frontend (development): http://localhost:5173

### Seed Database (sample data - Hyderabad area)
```bash
npm run seed
```

This creates sample users, vehicles, facilities, incidents, and hazards for testing.

## 👥 User Roles & RBAC

| Role | Permissions |
|------|-------------|
| **Citizen** | incident:create, incident:view-own, location:share |
| **Dispatcher** | incident:view-all, incident:assign, incident:re-route, vehicle:view, hospital:view |
| **Driver/Responder** | incident:view-assigned, incident:update-status, location:stream |
| **Hospital Staff** | hospital:update-capacity, patient:accept, incident:view-assigned |
| **Admin** | All permissions (`*`) |

## 🔐 Authentication Flow

1. **Register/Login** → JWT access token + refresh token in httpOnly cookies
2. **API calls** → Access token sent via `Authorization: Bearer <token>` header (or automatic cookie reading)
3. **Token expiry** → Use refresh token endpoint to get new access token
4. **Logout** → Clear cookies on client and server

## 🗺️ Routing System

### Primary: OSRM (Open Source Routing Machine)
- `alternatives=true` - Returns up to 3 route alternatives
- Caching with 1-hour TTL for repeated requests
- 8-second timeout with graceful fallback

### Fallback: Straight-line Haversine Estimate
- Used when OSRM fails or times out
- Assumes 10 m/s travel speed for ETA calculation

### Hazard Avoidance
- Each OSRM alternative checked against active MongoDB hazard zones
- Geospatial intersection using 2dsphere indexes
- Penalty applied based on proximity to hazard center
- Next best alternative selected if primary route is compromised

### Emergency-Type Logic
- **Medical** (priority 1): Nearest hospital with free beds and required specialty
- **Fire** (priority 2): Nearest fire station with available engine
- **Police** (priority 3): Nearest available police unit
- Capacity checked in real-time; re-route if hospital fills up

## ⏰ Incident Status Flow

```
Reported → Assigned → En Route → Arrived → Resolved
```

Each status transition has business rules:
- **Reported**: Citizen creates incident, route planned
- **Assigned**: Dispatcher assigns vehicle, vehicle status → en_route
- **En Route**: Driver starts GPS streaming, ETA calculation active
- **Arrived**: Vehicle on scene, hospital notified, beds decremented
- **Resolved**: Incident closed, hospital beds incremented, audit log written

## 📊 Dashboard Features

- **Incidents by type**: Bar chart with counts and average severity
- **Status counts**: Pie chart showing distribution across status flow
- **Average response time**: Minutes by emergency type (resolved incidents only)
- **Heatmap**: Incident locations with severity-weighted markers
- **Busiest areas**: Concentration heatmap from last N days
- **Hospital capacity**: Real-time bed/ICU/oxygen availability

## 🐳 Docker Deployment

### Local Development
```bash
docker-compose up --build
```

### Production
- Backend deployed on **Render**
- Frontend deployed on **Vercel**
- MongoDB Atlas for database
- Environment variables set in each platform

## 🧪 Testing

### Backend Tests
```bash
npm test
# Or specifically:
npm run test  # Runs Jest + Supertest
```

### Test Coverage Areas
- Auth routes (register, login, refresh, logout, forgot/reset password)
- RBAC middleware permissions
- Incident CRUD with validation
- Route planning with OSRM fallback
- Hospital capacity updates
- Hazard avoidance logic

### Frontend Tests
- React Testing Library for components
- Context API tests (AuthContext, etc.)

## 📡 API Endpoints (Key)

### Auth (Public)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login, sets cookies
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Clear cookies
- `GET /api/auth/me` - Get profile (protected)

### Incidents (Protected)
- `GET /api/incidents` - List with pagination/filter/sort
- `GET /api/incidents/:id` - Get single incident
- `POST /api/incidents` - Create (SOS)
- `PATCH /api/incidents/:id/status` - Update status
- `PATCH /api/incidents/:id/assign` - Assign vehicle
- `POST /api/incidents/:id/re-route` - Recalculate route

### Facilities (Protected)
- `GET /api/facilities` - List hospitals/fire stations/police
- `PATCH /api/facilities/:id/capacity` - Update capacity
- `POST /api/hospital/:id/accept-patient` - Accept patient

### Dashboard (Protected)
- `GET /api/dashboard/incidents-by-type`
- `GET /api/dashboard/status-counts`
- `GET /api/dashboard/average-response-time`
- `GET /api/dashboard/heatmap`
- `GET /api/dashboard/busiest-areas`

### Hazards (Protected)
- `GET /api/hazards` - Active hazards
- `POST /api/hazards` - Report new hazard
- `PATCH /api/hazards/:id/resolve` - Resolve hazard
- `GET /api/hazards/nearby` - Hazards near location

## 📱 Frontend Pages (Planned)

- **Login/Register** - Auth forms with validation
- **Dashboard** - Main overview with maps and charts
- **Incident Detail** - Live route tracking and status
- **Map View** - Leaflet map with GPS vehicles and hazards
- **Hospital Management** - Capacity updates and patient acceptance
- **Admin Panel** - User, vehicle, facility management

## 🌐 Internationalization

Supported languages: **English, Hindi, Telugu**
- Uses `react-i18next` for translation management
- JSON translation files in `public/locales/`
- Default: English

## 📞 API Authentication

### Access Token
- Sent via `Authorization: Bearer <token>` header
- Or automatic reading from `auth-access-token` httpOnly cookie

### Refresh Token
- Stored in `auth-refresh-token` httpOnly cookie
- Auto-refresh on 401 response (client-side)
- Rotating refresh tokens for security

### Cookie Security
- `secure: true` in production (HTTPS only)
- `httpOnly: true` - JavaScript cannot access
- `sameSite: 'lax'` - CSRF protection
- `maxAge` set per environment variable

## 🆘 Known Limitations & Workarounds

| Limitation | Workaround |
|------------|------------|
| No Redis for session/cache | In-memory cache with TTL (Phase 1) |
| No SMS notifications | Email via Nodemailer (configure SMTP) |
| No PWA features | Meta tags can be added later |
| OSRM public API rate limits | In-memory caching (1hr TTL) |
| No real GPS data | Simulated GPS via API calls in development |

## 📦 Built & Run Commands

```bash
# Install dependencies
npm install

# Development mode (auto-restart)
npm run dev

# Production mode
npm start

# Run seeds
npm run seed

# Lint
npm run lint  # ESLint check

# Test
npm test      # Jest + Supertest

# Docker
docker-compose up --build
docker-compose down
```

## 📸 Screenshots (Planned)

- Live map with routing and GPS tracking
- Dashboard with analytics charts
- Incident creation flow
- Hospital capacity management
- Dark mode UI

---

**Emergency Route Planner** - Saving critical minutes in emergencies worldwide.