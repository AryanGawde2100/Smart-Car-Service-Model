# AutoCare AI

## Smart Car Service Management System

AutoCare AI is a full-stack vehicle maintenance management application. It combines:

- FastAPI for the REST API
- SQLite and SQLAlchemy for persistence
- JWT authentication
- A vanilla HTML, CSS, and JavaScript frontend
- A scikit-learn predictive maintenance model
- Service booking and status tracking
- Prediction history for each vehicle

The project is designed for local development on Windows and runs on port `8000`.

---

## 1. What the application does

The application allows a customer to:

1. Create an account.
2. Sign in with a username and password.
3. Add one or more cars.
4. Edit or delete cars.
5. Book maintenance services.
6. Change service status and add mechanic notes.
7. Ask the AI engine to estimate service risk.
8. Review previous predictions.
9. Sign out securely.

The dashboard presents this information in a modern responsive interface with:

- Animated glass-style cards
- Dashboard statistics
- Searchable service history
- Modal forms
- Loading skeletons
- Toast notifications
- Empty states
- Password visibility controls
- Password strength feedback
- Risk badges and probability gauges

---

## 2. Technology stack

### Backend

- Python 3.10 or newer
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- python-jose for JWT tokens
- passlib for password hashing
- python-multipart for form requests
- python-dotenv for environment loading

### Database

- SQLite
- Database file: `car_service.db`
- SQLAlchemy ORM models in `app/models.py`

### Machine learning

- pandas
- NumPy
- scikit-learn
- joblib

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- No React, Vue, Angular, or build system is required

---

## 3. Project structure

```text
Smart car service model/
|
|-- app/
|   |-- __init__.py          Loads environment variables
|   |-- main.py              FastAPI application and static frontend serving
|   |-- database.py          SQLite engine and database dependency
|   |-- models.py            SQLAlchemy database models
|   |-- schemas.py           Pydantic request validation models
|   |-- auth.py              Password hashing and JWT creation
|   |-- dependencies.py      Authenticated-user dependency
|   |-- ml_service.py        Model loading and prediction logic
|   |-- utils.py             Reserved utility module
|   |
|   `-- routers/
|       |-- auth.py           Registration and login routes
|       |-- cars.py           Car CRUD routes
|       |-- services.py       Service booking and update routes
|       `-- prediction.py     Prediction and history routes
|
|-- frontend/
|   |-- index.html            Redirect/loading page
|   |-- login.html            Sign-in and registration page
|   |-- dashboard.html        Main authenticated dashboard
|   |-- script.js             Frontend API calls and UI behavior
|   `-- style.css             Design system, responsive layout, animations
|
|-- ml/
|   |-- generate_dataset.py   Creates the sample training dataset
|   |-- car_service_dataset.csv
|   |-- train_model.py        Trains and saves the classifier
|   `-- model.pkl             Serialized trained model
|
|-- test_auth.py              Existing authentication regression test
|-- requirement.txt           Python dependencies
|-- .env                      Local configuration and secrets
|-- .gitignore                Ignored local files
|-- car_service.db            Local SQLite database, ignored by Git
`-- PROJECT_DOCUMENTATION.md  This guide
```

The `.venv` directory is local-only and is intentionally excluded from source control.

---

## 4. Requirements

Install the following before starting:

- Windows 10 or Windows 11
- Python 3.10+
- Node.js and npm, only if the `omniroute` service is required
- A terminal such as PowerShell

Verify Python:

```powershell
python --version
```

Verify Node.js if needed:

```powershell
node --version
npm --version
```

---

## 5. First-time setup on Windows

Open PowerShell in the project directory:

```powershell
cd "C:\Products\Smart car service model"
```

### 5.1 Create the virtual environment

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution for the current user, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then activate the environment again.

### 5.2 Install Python dependencies

```powershell
pip install -r requirement.txt
```

The dependency file contains the runtime packages used by the API, database layer,
authentication, frontend form handling, and machine-learning service.

### 5.3 Configure environment variables

Create or edit `.env` in the project root:

```dotenv
DATABASE_URL=sqlite:///./car_service.db
SECRET_KEY=replace-this-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Important:

- Never commit `.env`.
- Never publish the secret key.
- Use a different strong secret in production.
- Changing the secret invalidates existing JWT tokens.
- The application loads `.env` during import through `app/__init__.py`.

### 5.4 Generate the model if necessary

The repository already contains `ml/model.pkl`. Retrain it only when the dataset or
training code changes:

```powershell
.\.venv\Scripts\python.exe ml\train_model.py
```

Do not run `generate_dataset.py` casually in production because it replaces the
training CSV with newly generated sample data.

### 5.5 Start the API and frontend

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open:

- Application: http://127.0.0.1:8000/static/
- Login: http://127.0.0.1:8000/static/login.html
- Dashboard: http://127.0.0.1:8000/static/dashboard.html
- API health: http://127.0.0.1:8000/health
- Swagger documentation: http://127.0.0.1:8000/docs

The root URL returns an API status object. The `/static/` path serves the frontend.

---

## 6. Optional omniroute setup

If the external model-monitoring service is part of the local workflow:

```powershell
npm i -g omniroute@3.8.50
omniroute serve --port 20128
```

Verify it:

```powershell
curl.exe http://127.0.0.1:20128/api/monitoring/health
```

This service is separate from the FastAPI application. AutoCare AI itself uses the
local scikit-learn model in `ml/model.pkl`.

---

## 7. Backend architecture

### 7.1 Application startup

`app/main.py`:

1. Creates database tables with `Base.metadata.create_all`.
2. Creates the FastAPI application.
3. Configures CORS for:
   - `http://127.0.0.1:8000`
   - `http://localhost:8000`
4. Mounts the four routers.
5. Serves the `frontend` directory at `/static`.
6. Exposes `/` and `/health`.

### 7.2 Database connection

`app/database.py` reads `DATABASE_URL`, defaulting to:

```text
sqlite:///./car_service.db
```

SQLite uses `check_same_thread=False` because FastAPI requests may be handled across
different execution contexts. Each request receives a SQLAlchemy session through
`get_db`, and the session is closed after the request finishes.

### 7.3 Authentication flow

1. The user submits a username and password.
2. The backend checks the user record.
3. Passwords are hashed with PBKDF2-SHA256 through passlib.
4. Successful login returns a JWT bearer token.
5. The frontend stores the token in `localStorage`.
6. Authenticated API requests send:

```http
Authorization: Bearer <token>
```

7. `get_current_user` decodes the token and loads the user from SQLite.

Tokens expire according to `ACCESS_TOKEN_EXPIRE_MINUTES`.

### 7.4 Ownership protection

Cars, services, and predictions are scoped to the authenticated user:

- A customer can only read or modify their own cars.
- A service can only be booked for the customer’s own car.
- Prediction history checks that the requested car belongs to the current user.

---

## 8. Database model

### Users

| Column | Type | Description |
|---|---|---|
| `id` | Integer | Primary key |
| `username` | String | Unique login name |
| `password` | String | Password hash |
| `role` | String | Defaults to `customer` |
| `is_active` | Boolean | Account status |

### Cars

| Column | Type | Description |
|---|---|---|
| `id` | Integer | Primary key |
| `owner_id` | Integer | Foreign key to users |
| `brand` | String | Manufacturer |
| `model` | String | Model name |
| `year` | Integer | Validated from 1990 to 2030 |
| `km_driven` | Integer | Current mileage |
| `fuel_type` | String | Petrol by default |
| `last_service_km` | Integer | Mileage at last service |

### Services

| Column | Type | Description |
|---|---|---|
| `id` | Integer | Primary key |
| `car_id` | Integer | Foreign key to cars |
| `service_type` | String | Requested maintenance |
| `service_date` | DateTime | Assigned by the backend |
| `cost` | Float | Estimated or quoted cost |
| `status` | String | Booked, In Progress, Completed, or Cancelled |
| `mechanic_notes` | String | Optional service notes |

### Predictions

| Column | Type | Description |
|---|---|---|
| `id` | Integer | Primary key |
| `car_id` | Integer | Foreign key to cars |
| `car_age` | Integer | Computed from the current year |
| `km_driven` | Integer | Mileage used for the prediction |
| `months_since_service` | Integer | User-supplied input |
| `probability` | Float | Final blended service probability |
| `risk_level` | String | LOW, MEDIUM, or HIGH |
| `prediction` | String | Service Required or Service Not Required |
| `recommended_service` | String | Comma-separated recommendations |
| `created_at` | DateTime | Prediction timestamp |

---

## 9. REST API reference

All protected endpoints require a bearer token.

### Health

```http
GET /health
```

Example response:

```json
{
  "status": "healthy",
  "service": "Smart Car Service API"
}
```

### Register

```http
POST /auth/register
Content-Type: application/json
```

Request:

```json
{
  "username": "alex",
  "password": "strong-password"
}
```

Rules:

- Username length: 3-50 characters
- Password length: 6-72 characters
- Duplicate usernames return HTTP 400
- Missing credentials return HTTP 422

Response:

```json
{
  "message": "Registration successful"
}
```

The endpoint also accepts form-encoded login/registration payloads because the
frontend and API support both JSON and browser form workflows.

### Login

```http
POST /auth/login
```

Request:

```json
{
  "username": "alex",
  "password": "strong-password"
}
```

Response:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "role": "customer"
}
```

Invalid credentials return HTTP 401.

### Create car

```http
POST /cars/
Authorization: Bearer <jwt>
```

Request:

```json
{
  "brand": "Toyota",
  "model": "Camry",
  "year": 2012,
  "km_driven": 59432,
  "fuel_type": "Petrol",
  "last_service_km": 59200
}
```

### List cars

```http
GET /cars/
Authorization: Bearer <jwt>
```

### Get one car

```http
GET /cars/{car_id}
Authorization: Bearer <jwt>
```

### Update car

```http
PUT /cars/{car_id}
Authorization: Bearer <jwt>
```

The update request must include the complete car payload, not only changed fields.

### Delete car

```http
DELETE /cars/{car_id}
Authorization: Bearer <jwt>
```

Deleting a car also removes dependent records through the configured database
relationship behavior or database constraints. Test deletion behavior before using
it in a production migration.

### Book service

```http
POST /services/
Authorization: Bearer <jwt>
```

Request:

```json
{
  "car_id": 1,
  "service_type": "Engine service",
  "cost": 345.77
}
```

The backend assigns the current UTC timestamp to `service_date` and starts the
service with status `Booked`.

The endpoint also schedules a background notification that appends a line to
`service_notifications.txt`. This is a simple local demonstration mechanism, not a
production email or SMS provider.

### List services

```http
GET /services/
Authorization: Bearer <jwt>
```

Only services belonging to the current user’s cars are returned.

### Update service

```http
PUT /services/{service_id}
Authorization: Bearer <jwt>
```

Request:

```json
{
  "status": "Completed",
  "mechanic_notes": "Oil and brake inspection completed"
}
```

Supported UI statuses:

- `Booked`
- `In Progress`
- `Completed`
- `Cancelled`

### Run prediction

```http
POST /prediction/
Authorization: Bearer <jwt>
```

Request:

```json
{
  "car_id": 1,
  "months_since_service": 4
}
```

`months_since_service` must be between 0 and 60.

Example response:

```json
{
  "car_id": 1,
  "car": "Toyota Camry",
  "prediction": "Service Not Required",
  "probability": 0.422,
  "model_probability": 0.98,
  "risk_level": "LOW",
  "recommended_service": [
    "Routine maintenance"
  ],
  "risk_factors": [],
  "probability_note": "Blended estimate using the ML model, mileage, vehicle age, and time since service."
}
```

### Prediction history

```http
GET /prediction/history/{car_id}
Authorization: Bearer <jwt>
```

The newest prediction is returned first.

---

## 10. Machine-learning system

### 10.1 Training data

The dataset contains:

- `car_age`
- `km_driven`
- `months_since_service`
- `service_required`

The sample generator creates 1,500 rows with the following synthetic rule:

```text
service_required = 1 when:
  car_age >= 7
  OR km_driven >= 70000
  OR months_since_service >= 10
```

This is synthetic data, not a medical-grade, safety-certified, or manufacturer
maintenance dataset. It is suitable for demonstration and software integration,
not for making safety-critical decisions.

### 10.2 Training process

`ml/train_model.py` evaluates:

- Balanced Logistic Regression
- Balanced Decision Tree
- Balanced Random Forest

It prints accuracy, precision, recall, F1, and ROC AUC. The current training
workflow deliberately saves Logistic Regression because it provides smoother,
continuous probability estimates than a decision tree with pure 0/1 leaves.

Retrain:

```powershell
.\.venv\Scripts\python.exe ml\train_model.py
```

### 10.3 Runtime prediction

`app/ml_service.py`:

1. Loads `ml/model.pkl`.
2. Builds a named DataFrame with the three model features.
3. Gets the model probability for service required.
4. Combines the model signal with transparent maintenance pressure:
   - 20% age pressure
   - 40% mileage pressure
   - 40% months-since-service pressure
5. Limits the final probability to 2%-98%.
6. Maps the final probability to risk:
   - `>= 0.75`: HIGH
   - `>= 0.45`: MEDIUM
   - otherwise: LOW
7. Generates recommendations and risk factors.

The hybrid layer exists because the generated dataset is strongly imbalanced and
contains unrealistic age-driven patterns. It prevents age alone from making a
moderately driven, recently serviced car appear HIGH risk.

### 10.4 Interpreting predictions

Predictions are estimates, not diagnoses or guarantees.

The result should be interpreted alongside:

- The actual vehicle manufacturer service schedule
- Warning lights
- Recent repairs
- Driving conditions
- Vehicle usage
- A qualified mechanic’s inspection

The dashboard explicitly warns when a car is outside the feature range represented
by the training data.

---

## 11. Frontend behavior

### Login page

`frontend/login.html` contains:

- Sign-in tab
- Create-account tab
- Username and password forms
- Password visibility buttons
- Password strength meter
- Validation and status messages

`frontend/script.js` sends requests to:

```javascript
const API_BASE = "http://127.0.0.1:8000";
```

This must remain consistent with the FastAPI port and CORS configuration.

### Dashboard

`frontend/dashboard.html` contains:

- Summary statistic cards
- Your Cars panel
- Add/edit car modal
- Services panel
- Book service modal
- Service search
- Status update controls
- AI prediction panel
- Prediction history panel
- Toast notification area

### Client-side state

The JavaScript keeps the current page state in:

- `carsCache`
- `servicesCache`
- `predictionsCache`

After mutations, the relevant data is reloaded so the UI stays synchronized with
the API.

### Safety and presentation

API-rendered text is escaped before it is inserted into HTML. This reduces the risk
of displaying untrusted values as markup. The frontend also handles:

- Loading states
- Empty lists
- API errors
- Expired authentication
- Disabled submit buttons during requests

---

## 12. Testing and verification

### Run the complete existing test suite

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

### Run the authentication test directly

```powershell
.\.venv\Scripts\python.exe -m pytest test_auth.py -q
```

### Check Python diagnostics

Use the editor Problems panel or run the project’s existing checks. The main
application files should have no reported syntax or type errors.

### Validate frontend JavaScript syntax

If Node.js is installed:

```powershell
node --check frontend\script.js
```

### Check HTTP endpoints

PowerShell may alias `curl` to `Invoke-WebRequest`; use `curl.exe`:

```powershell
curl.exe -i http://127.0.0.1:8000/health
curl.exe -i http://127.0.0.1:8000/docs
curl.exe -I http://127.0.0.1:8000/static/login.html
curl.exe -I http://127.0.0.1:8000/static/dashboard.html
```

### Recommended manual acceptance test

1. Open `login.html`.
2. Register a temporary user.
3. Sign in.
4. Add a low-mileage recent vehicle.
5. Add an older high-mileage vehicle.
6. Book a service for each vehicle.
7. Change one service to `Completed`.
8. Run predictions with 2, 4, 12, and 24 months since service.
9. Confirm probability, verdict, and risk level agree.
10. Confirm prediction history updates.
11. Edit a vehicle.
12. Delete the temporary vehicles.
13. Log out.
14. Remove the temporary account and any generated notification file.

Always use temporary test accounts for manual testing.

---

## 13. Troubleshooting

### Port 8000 is already in use

Find the process:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match "uvicorn.*app\\.main" } |
  Select-Object ProcessId, CommandLine
```

Stop only the specific process IDs that belong to this project:

```powershell
Stop-Process -Id <PID> -Force
```

Then start Uvicorn again.

### Dashboard displays 401 errors

The browser may have an expired token in `localStorage`.

1. Click Logout.
2. Sign in again.
3. Reload the dashboard.

If developing in the browser console, remove the token manually:

```javascript
localStorage.removeItem("access_token");
```

### Model changes do not appear

Uvicorn may still have the old Python module or model loaded.

1. Stop all project Uvicorn processes.
2. Retrain if required.
3. Start one fresh Uvicorn process.
4. Run a new prediction instead of relying on historical records.

Historical predictions intentionally remain unchanged.

### Model file missing

Run:

```powershell
.\.venv\Scripts\python.exe ml\train_model.py
```

Run the command from the project root so the relative `ml/` paths resolve.

### Database appears empty or different

Confirm the working directory:

```powershell
Get-Location
```

The default SQLite path is relative to the process working directory. Start
Uvicorn from the project root.

### CORS errors

Use the same origin consistently:

```text
http://127.0.0.1:8000
```

Do not open the HTML with a `file:///` URL. Serve it through FastAPI.

### Background notification file appears

`service_notifications.txt` is created after a service booking. It is a local
demonstration of FastAPI `BackgroundTasks`. It can be safely removed during local
testing, but do not treat it as a reliable production notification system.

---

## 14. Security guidance

Before deployment:

1. Replace the local `SECRET_KEY`.
2. Keep `.env` outside source control.
3. Use HTTPS.
4. Restrict CORS to the real frontend origin.
5. Move SQLite to a managed database if concurrent production traffic is expected.
6. Replace file-based notifications with an authenticated email or messaging
   provider.
7. Add rate limiting to registration and login.
8. Add audit logging for sensitive operations.
9. Validate service status values server-side with an enum or explicit allow-list.
10. Review token storage strategy; `localStorage` is convenient but vulnerable if
    the page ever has an XSS issue.
11. Use a consistent, pinned dependency lock strategy for repeatable deployments.
12. Retrain and evaluate the ML model with real, representative maintenance data
    before using it for operational decisions.

The current project is a local demonstration and management application. The ML
output should not replace a mechanic or manufacturer maintenance schedule.

---

## 15. Deployment notes

A basic non-development start command is:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For a real deployment:

- Put a reverse proxy in front of Uvicorn.
- Enable HTTPS.
- Set production environment variables through the host, not a committed file.
- Use a persistent database volume.
- Back up the database.
- Monitor application logs.
- Configure a process manager to restart the service.
- Do not expose the development reload option.

Because the frontend is served by the same FastAPI origin, no separate frontend
build or static hosting step is needed for the current architecture.

---

## 16. Development workflow

Recommended sequence when changing the project:

1. Start from the project root.
2. Activate `.venv`.
3. Read the relevant router, schema, model, and frontend function before editing.
4. Make a focused change.
5. Restart Uvicorn if backend modules or `model.pkl` changed.
6. Run `pytest -q`.
7. Run `node --check frontend\script.js` after JavaScript changes.
8. Check `/health` and `/docs`.
9. Test the changed browser workflow.
10. Remove temporary users and records.
11. Confirm `.env` and `car_service.db` remain untracked.

---

## 17. Current limitations and future improvements

### Current limitations

- The ML dataset is synthetic.
- The model only uses three numerical features.
- Prediction history is append-only.
- There is no separate mechanic/admin dashboard.
- Service notifications are file-based.
- SQLite is best suited to local or low-concurrency usage.
- The frontend uses `localStorage` for the JWT.
- Server-side validation of service status could be stricter.

### Practical next improvements

1. Add real historical service outcomes.
2. Add cross-validation and calibration metrics.
3. Store model version and training date with each prediction.
4. Add confidence explanations based on feature contributions.
5. Add car service reminders and date-based scheduling.
6. Add mechanic/admin roles and dashboards.
7. Add pagination and filtering to service and prediction history.
8. Add automated API integration tests.
9. Add database migrations instead of relying only on table creation.
10. Add email or push notifications.
11. Add a production database such as PostgreSQL.
12. Add accessibility testing and end-to-end browser tests.

---

## 18. Quick command reference

```powershell
# Enter project
cd "C:\Products\Smart car service model"

# Create environment
python -m venv .venv

# Activate
.\.venv\Scripts\Activate.ps1

# Install
pip install -r requirement.txt

# Train
.\.venv\Scripts\python.exe ml\train_model.py

# Start
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Test
.\.venv\Scripts\python.exe -m pytest -q

# Check JavaScript
node --check frontend\script.js

# Health
curl.exe http://127.0.0.1:8000/health
```

---

## 19. Project status

The current implementation includes:

- Working FastAPI application
- SQLite persistence
- JWT authentication
- Registration and login
- User-scoped car CRUD
- Service booking and updates
- Prediction endpoint and history
- Retrained probability-aware ML model
- Hybrid risk interpretation
- Premium responsive frontend
- Loading, error, empty, and success states
- Existing regression test coverage

For the most reliable local experience, start the API from the repository root,
open the frontend through `http://127.0.0.1:8000/static/`, and create fresh
predictions after changing the model. Historical prediction rows represent the
logic that existed when they were created.

---

# Viva Preparation: Source-Code-Accurate Analysis

This section was prepared by inspecting the actual Python, JavaScript, HTML, CSS,
and ML files. If an earlier section or an informal description conflicts with the
source code, the source code is authoritative.

## 20. Complete architecture

### Simple architecture diagram

```text
User
  |
  v
HTML/CSS/Vanilla JavaScript in frontend/
  |
  | fetch() with JSON and Authorization: Bearer <JWT>
  v
FastAPI app.main:app on 127.0.0.1:8000
  |
  +--> auth router ------> User table
  |
  +--> cars router ------> Car table
  |
  +--> services router --> Service table
  |          |
  |          +-----------> BackgroundTasks -> service_notifications.txt
  |
  +--> prediction router -> Car ownership check
              |
              +----------> app.ml_service.py -> ml/model.pkl
              |                                  |
              +----------------< JSON result <---+
              |
              +----------> Prediction table
```

### What starts the application

The command starts Uvicorn, which imports `app.main:app`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

During import, `app.main`:

1. Imports the SQLAlchemy `Base` and `engine`.
2. Executes `Base.metadata.create_all(bind=engine)`.
3. Constructs the FastAPI application.
4. Adds CORS middleware.
5. Includes the authentication, cars, services, and prediction routers.
6. Mounts `frontend/` at `/static`.

`app/__init__.py` calls `load_dotenv()`, so values from `.env` are loaded before
the other application modules read configuration.

### What happens when the website opens

1. The browser requests `/static/index.html`, `/static/login.html`, or
   `/static/dashboard.html`.
2. FastAPI's `StaticFiles` serves the requested HTML, CSS, and JavaScript.
3. `index.html` redirects to `login.html`.
4. `script.js` checks `localStorage` for `access_token`.
5. A login page redirects to the dashboard only if a token exists.
6. A dashboard redirects to login if no token exists.
7. The dashboard loads cars, services, and prediction history using authenticated
   `fetch()` calls.

### Request lifecycle

For a protected request:

1. JavaScript builds a URL from `API_BASE`.
2. `apiFetch()` adds JSON headers and the bearer token.
3. FastAPI matches the router and endpoint.
4. Dependency injection creates a database session with `get_db`.
5. `get_current_user` decodes the JWT and loads the user.
6. The endpoint validates ownership and performs its business operation.
7. SQLAlchemy commits or queries SQLite.
8. FastAPI serializes the return value as JSON.
9. JavaScript updates the cache and re-renders the relevant UI.

## 21. File-by-file source analysis

### `app/main.py`

Important implementation:

- Creates tables at import time with `Base.metadata.create_all`.
- Defines FastAPI title, description, and version `2.0.0`.
- Allows CORS from exactly:
  - `http://127.0.0.1:8000`
  - `http://localhost:8000`
- Allows credentials, all methods, and all headers.
- Includes `auth.router`, `cars.router`, `services.router`, and
  `prediction.router`.
- Calculates the absolute `frontend` directory and mounts it at `/static`.
- Provides `GET /` and `GET /health`.

Viva point: this application serves both the API and static frontend from one
Uvicorn process. There is no frontend build step.

### `app/database.py`

- Reads `DATABASE_URL` from the environment.
- Defaults to `sqlite:///./car_service.db`.
- Creates an SQLAlchemy engine with `check_same_thread=False`.
- Creates `SessionLocal` with `autocommit=False` and `autoflush=False`.
- Creates the declarative `Base`.
- `get_db()` yields a session and closes it in `finally`.

Viva point: yielding the session through a dependency guarantees cleanup after
each request, including when the endpoint raises an exception.

### `app/models.py`

Defines `User`, `Car`, `Service`, and `Prediction` ORM classes. Each class maps to
one SQLite table. Relationships use `relationship()` and `back_populates`.

The source does **not** configure SQLAlchemy cascade deletion options. Therefore,
one must not claim that dependent services and predictions are explicitly cascade
deleted by the ORM. SQLite foreign-key enforcement is also not explicitly enabled
in `database.py`. This is a current implementation limitation.

### `app/schemas.py`

Pydantic request models:

- `RegisterRequest`: username 3-50 characters, password 6-72 characters.
- `LoginRequest`: username and password strings.
- `CarCreate`: year 1990-2030, non-negative mileage, default Petrol fuel,
  non-negative `last_service_km`.
- `ServiceCreate`: car ID, service type, non-negative cost.
- `ServiceUpdate`: status and optional mechanic notes.
- `PredictionRequest`: car ID and `months_since_service` from 0 to 60.

Important source detail: the auth router imports `RegisterRequest` and
`LoginRequest` but actually reads `Request` bodies manually. Consequently, the
Pydantic length constraints are not automatically applied to those two routes.
The frontend performs some HTML validation, but server-side auth validation is
weaker than the schemas suggest.

### `app/auth.py`

- Reads `SECRET_KEY`, defaulting only if the environment variable is absent.
- Uses fixed `ALGORITHM = "HS256"`.
- Reads token lifetime from `ACCESS_TOKEN_EXPIRE_MINUTES`, default 60.
- Creates a `CryptContext` using `pbkdf2_sha256`.
- `hash_password()` creates a salted password hash.
- `verify_password()` checks a plaintext password against the stored hash.
- `create_access_token()` adds `sub`, `role`, and `exp` claims and encodes a JWT.

The current `.env` contains a generated strong secret. In production it must be
provided securely and must not be committed.

### `app/dependencies.py`

`oauth2_scheme` extracts a bearer token from the `Authorization` header.

`get_current_user()`:

1. Receives the token through FastAPI dependency injection.
2. Decodes it with `jwt.decode`.
3. Requires a `sub` claim.
4. Converts JWT errors into HTTP 401.
5. Queries the user by username.
6. Returns the SQLAlchemy `User` object.

`admin_required()` exists and checks `role == "admin"`, but no current router
uses it. The active UI is therefore customer-focused.

### `app/routers/auth.py`

`_read_auth_payload(request)` supports:

- JSON content types
- `application/x-www-form-urlencoded`
- `multipart/form-data`

Unsupported content types return missing values. Malformed JSON is converted to
missing credentials and produces HTTP 422.

`register()` checks duplicate username, hashes the password, inserts a customer
user, commits, and returns a success message.

`login()` looks up the user, verifies the hash, creates a JWT, and returns the
token, token type, and role. Both invalid usernames and invalid passwords return
the same HTTP 401 message.

### `app/routers/cars.py`

All endpoints depend on `get_current_user`.

- `POST /cars/`: creates a car with `owner_id=user.id`, commits, refreshes, and
  returns the ORM car.
- `GET /cars/`: returns only cars whose `owner_id` equals the current user.
- `GET /cars/{car_id}`: filters by both car ID and owner ID.
- `PUT /cars/{car_id}`: requires the full `CarCreate` payload, updates all car
  fields, commits, and returns a message.
- `DELETE /cars/{car_id}`: verifies ownership, deletes the car, commits, and
  returns a message.

### `app/routers/services.py`

`book_service()` verifies that the selected car belongs to the current user,
creates a service with the current UTC timestamp and status `Booked`, commits it,
then schedules `send_notification()` as a FastAPI background task.

`get_services()` joins services to cars and filters through `Car.owner_id`, so a
user receives only services for their cars.

`update_service()` joins to `Car`, checks both service ID and owner ID, then
updates status and mechanic notes.

Important limitation: `ServiceUpdate.status` is a plain string. The backend does
not enforce the four values shown in the UI. A client can submit another string.

### `app/routers/prediction.py`

`predict()`:

1. Receives `PredictionRequest`.
2. Finds the requested car with an owner check.
3. Computes `car_age = datetime.utcnow().year - car.year`.
4. Calls `predict_service(car_age, car.km_driven, months_since_service)`.
5. Stores the returned final probability, risk, verdict, and joined recommendations
   in `Prediction`.
6. Commits the history row.
7. Returns the car name and prediction result.

`prediction_history()` verifies ownership first, then returns that car's
predictions ordered by `created_at.desc()`.

### `app/ml_service.py`

- Loads `ml/model.pkl` at module import.
- Creates a named pandas DataFrame with the three model features.
- Gets `predict_proba()[:, 1]`.
- Combines model output with transparent maintenance pressure factors.
- Clips the final probability to 0.02-0.98.
- Maps probability to risk.
- Creates recommendations, risk factors, and a probability note.

### `ml/generate_dataset.py`

- Seeds NumPy with 42.
- Generates 1,500 rows.
- Generates age from 1-15, mileage from 5,000-149,999, and months from 1-24.
- Creates labels using OR logic:

```text
service_required = 1 if age >= 7
                       OR mileage >= 70000
                       OR months >= 10
```

This explains why the dataset is synthetic and why the positive class is much
larger than the negative class.

### `ml/train_model.py`

- Reads the CSV.
- Uses the three numerical features.
- Splits 80% training and 20% testing.
- Uses `random_state=42` and `stratify=y`.
- Tests balanced Logistic Regression, balanced Decision Tree, and balanced Random
  Forest.
- Prints accuracy, precision, recall, F1, and ROC-AUC.
- Always saves the trained Logistic Regression pipeline after evaluating all
  candidates, because its continuous probabilities are more useful than tree
  leaf probabilities for the dashboard.

### Frontend HTML

`index.html` is a lightweight redirect page with a loading spinner.

`login.html` includes sign-in and registration forms in one page. It includes
browser-required fields, password visibility buttons, and a strength meter.

`dashboard.html` contains four statistic cards, car management, service management,
the prediction form, prediction history, two modal forms, and a toast container.

### `frontend/script.js`

`API_BASE` is `http://127.0.0.1:8000`.

Important functions:

- `apiFetch()`: performs fetch requests, adds headers, parses JSON, and throws
  readable errors for non-2xx responses.
- `getToken()`, `setToken()`, `clearToken()`: manage the JWT in localStorage.
- `redirectIfLoggedIn()`: handles login/dashboard redirects.
- `loadCars()`, `renderCars()`: fetch and display cars.
- `loadServices()`, `renderServices()`: fetch, merge car names, filter, and display
  services.
- `loadPredictions()`: fetches history for every car and sorts newest first.
- `renderPredictionResult()`: displays verdict, gauge, probability, explanations,
  and recommendations.
- `popCarForm()`: fills the add/edit car modal.
- `escapeHtml()`: escapes API-derived text before HTML insertion.

State arrays:

- `carsCache`
- `servicesCache`
- `predictionsCache`

After create, update, delete, booking, or prediction actions, the script reloads
the relevant data and re-renders the UI.

### `frontend/style.css`

The stylesheet is a custom design system, not a CSS framework. It defines dark
theme variables, glass cards, gradients, responsive breakpoints, animations,
modal layouts, badges, skeleton loaders, gauges, buttons, and toast states.

## 22. Database deep analysis

### ER-style diagram

```text
USERS
  id (PK)
  username (UNIQUE)
  password
  role
  is_active
      |
      | User.id <- Car.owner_id
      v
CARS
  id (PK)
  owner_id (FK -> users.id)
  brand, model, year, km_driven, fuel_type, last_service_km
      |                         |
      | Car.id <- Service.car_id
      |                         +--> SERVICES
      |                              id, service_type, service_date,
      |                              cost, status, mechanic_notes
      |
      | Car.id <- Prediction.car_id
      +--------------------------> PREDICTIONS
                                   id, feature values, probability,
                                   risk_level, prediction, recommendations
```

### ORM explanation

SQLAlchemy maps Python classes to tables. For example, creating `Car(...)` creates
an in-memory ORM object; `db.add(car)`, `db.commit()`, and `db.refresh(car)` write
it to SQLite and populate its generated ID. Query expressions such as
`Car.owner_id == user.id` become SQL `WHERE` conditions.

### Ownership protection

Ownership is enforced by query filters, not by the frontend:

```text
Car.id == requested_id AND Car.owner_id == current_user.id
```

The same principle is used when listing services and history. Changing an ID in a
URL therefore does not expose another user's record; the lookup returns no object
and the endpoint returns 404.

### Car deletion caveat

The source calls `db.delete(car)` but does not define ORM cascade behavior. It
does not explicitly enable SQLite foreign keys either. Therefore the safest
accurate viva answer is: the endpoint deletes the car row, but dependent-record
cleanup is not explicitly implemented and should be verified or improved before
production use.

## 23. Authentication and security viva explanation

### Registration flow

```text
Form/JSON
 -> POST /auth/register
 -> _read_auth_payload()
 -> duplicate username query
 -> hash_password() using salted PBKDF2-SHA256
 -> User insert and commit
 -> success JSON
```

### Login flow

```text
Credentials
 -> POST /auth/login
 -> user lookup
 -> verify_password()
 -> create_access_token()
 -> JWT JSON response
 -> frontend stores access_token in localStorage
```

The header is:

```http
Authorization: Bearer <JWT>
```

`Bearer` tells the OAuth2 dependency that the following value is an access token.
The backend decodes the JWT, checks expiry through the JWT library, reads `sub`,
and loads the corresponding user.

### Security facts

- Passwords are not stored as plaintext.
- PBKDF2-SHA256 hashes include a salt generated by passlib.
- The JWT contains username (`sub`), role, and expiry (`exp`).
- The token lifetime defaults to 60 minutes.
- The current frontend stores the token in localStorage.
- Expired or malformed tokens produce HTTP 401.
- CORS is appropriate for the two local origins but permissive in methods/headers.
- The `.env` secret is strong locally, but secrets must be managed externally in
  production.
- The auth route's manual request parsing bypasses Pydantic length validation.
- There is no login rate limiting, refresh-token flow, or account lockout.

## 24. Complete API table

| Method | Endpoint | Auth | Input | Output / behavior | Important errors |
|---|---|---:|---|---|---|
| GET | `/` | No | None | API name, status, version | None |
| GET | `/health` | No | None | Healthy status JSON | None |
| POST | `/auth/register` | No | JSON/form username and password | Registration message | 400 duplicate, 422 missing |
| POST | `/auth/login` | No | JSON/form username and password | JWT, token type, role | 401 invalid, 422 missing |
| POST | `/cars/` | Yes | Full `CarCreate` | Created car | 401, 422 |
| GET | `/cars/` | Yes | None | Current user's cars | 401 |
| GET | `/cars/{car_id}` | Yes | Path ID | One owned car | 401, 404 |
| PUT | `/cars/{car_id}` | Yes | Full `CarCreate` | Update message | 401, 404, 422 |
| DELETE | `/cars/{car_id}` | Yes | Path ID | Delete message | 401, 404 |
| POST | `/services/` | Yes | `car_id`, type, cost | Service ID/message | 401, 404, 422 |
| GET | `/services/` | Yes | None | Owned services | 401 |
| PUT | `/services/{service_id}` | Yes | Status, optional notes | Update message | 401, 404, 422 |
| POST | `/prediction/` | Yes | `car_id`, months 0-60 | Prediction and saved history | 401, 404, 422 |
| GET | `/prediction/history/{car_id}` | Yes | Path car ID | Newest-first history | 401, 404 |

There are no additional runtime routers in the source tree.

## 25. Exact hybrid prediction logic

Inputs actually used:

- `car_id` identifies and authorizes the car.
- `car_age` is calculated by the backend from the current UTC year and car year.
- `km_driven` comes from the stored car.
- `months_since_service` comes from the request and is constrained to 0-60.

The model probability is:

```text
model_probability = model.predict_proba(
    [car_age, km_driven, months_since_service]
)[0][1]
```

The code then clips that value for presentation:

```text
clipped_model_probability = min(max(model_probability, 0.02), 0.98)
```

Pressure factors are:

```text
age_pressure = clamp((car_age - 10) / 8, 0, 1)
mileage_pressure = clamp((km_driven - 60000) / 100000, 0, 1)
months_pressure = clamp(months_since_service / 12, 0, 1)
```

The final probability is:

```text
final_probability =
    0.25 * model_probability
  + 0.75 * (
        0.20 * age_pressure
      + 0.40 * mileage_pressure
      + 0.40 * months_pressure
    )
```

The final result is clipped again:

```text
final_probability = clamp(final_probability, 0.02, 0.98)
```

Risk thresholds:

- `final_probability >= 0.75`: HIGH
- `final_probability >= 0.45`: MEDIUM
- otherwise: LOW

The verdict is generated from the **final probability**, not directly from the
classifier's hard `predict()` result:

- final probability at least 0.5: `Service Required`
- otherwise: `Service Not Required`

Recommendations:

- HIGH: General inspection, Engine oil check, Brake inspection, Battery check
- MEDIUM: General inspection, Engine oil check
- LOW: Routine maintenance

Risk factors:

- Age 15 or more: `Vehicle is 15+ years old`
- Mileage at least 120,000: `Mileage is above 120,000 km`
- Months at least 12: `More than 12 months since the last service`

Out-of-range note:

- Age above 15, mileage above 150,000, or months above 24 produces an explanatory
  note saying the estimate is blended with maintenance thresholds.

### Manual example

Use:

```text
car_age = 14
km_driven = 59432
months_since_service = 4
```

With the current saved model, the model probability is approximately `0.98`.

```text
age_pressure     = clamp((14 - 10) / 8, 0, 1)       = 0.50
mileage_pressure = clamp((59432 - 60000) / 100000)  = 0.00
months_pressure  = clamp(4 / 12, 0, 1)              = 0.333

maintenance_pressure =
    0.20(0.50) + 0.40(0.00) + 0.40(0.333)
  = 0.2332

final_probability =
    0.25(0.98) + 0.75(0.2332)
  = 0.245 + 0.1749
  = 0.4199, approximately 0.42
```

The API rounds this to `0.422` for the tested Camry scenario. It is therefore
LOW and the final verdict is `Service Not Required`. The old dashboard HIGH
records are historical records created before this logic was corrected.

### Why hybrid logic is used

The code comments explain that the source dataset is synthetic and heavily
weighted toward `service_required`. Combining the model with transparent factors
reduces the chance that the learned synthetic pattern alone dominates a real
dashboard decision.

Natural viva answer:

> Logistic Regression provides a learned probability, while the maintenance
> pressure layer keeps the result understandable and tied to practical thresholds
> such as mileage and time since service. It is still an estimate, not a guarantee.

The limitation is that the weights are hand-designed domain-inspired weights;
they were not learned from a validated real-world maintenance study.

## 26. Actual ML data and performance

The current CSV has 1,500 rows and four columns. It has:

- 1,390 positive labels (`service_required = 1`)
- 110 negative labels (`service_required = 0`)
- Positive class: approximately 92.67%
- Negative class: approximately 7.33%

The negative examples occur only where all three OR-rule conditions are false.
There are no negative samples with age 7 or more, mileage 70,000 or more, or
months 10 or more. This is why the dataset is not a realistic balanced service
outcome dataset.

The training script was run with the current environment. Exact holdout results:

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Logistic Regression | 0.9267 | 0.9961 | 0.9245 | 0.9590 | 0.9859 |
| Decision Tree | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Random Forest | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

These are a single 80/20 holdout, not proof of real-world performance. The
perfect tree scores are expected because the target is generated from simple
threshold rules that the trees can learn. No confusion matrix is printed by the
actual training script.

The saved `model.pkl` is a scikit-learn `Pipeline` containing:

```text
StandardScaler()
LogisticRegression(class_weight="balanced", max_iter=1000)
```

### Model viva explanations

**Logistic Regression:** scales features, calculates a weighted linear score, and
passes it through a sigmoid to produce a probability. It is fast and interpretable
but assumes a mostly linear relationship.

**Decision Tree:** recursively splits feature values into regions. It is easy to
explain and captures thresholds, but can overfit and produce leaf probabilities
of exactly 0 or 1.

**Random Forest:** averages many randomized decision trees. It is usually more
stable than one tree, but less interpretable and can still be overconfident on
synthetic threshold data.

## 27. Frontend-backend flows

### Login

1. User submits `#loginForm`.
2. JavaScript sends `POST /auth/login`.
3. API returns `access_token`.
4. `setToken()` saves it in localStorage.
5. Browser navigates to `dashboard.html`.

### Add car

1. User opens the Add Car modal.
2. JavaScript collects brand, model, year, fuel, mileage, and last-service km.
3. It sends `POST /cars/`.
4. The API assigns the current user as owner.
5. JavaScript reloads cars and fills service/prediction selects.

### Book service

1. User opens Book Service.
2. JavaScript sends `POST /services/`.
3. API verifies the car owner, inserts a `Booked` service, and schedules a file
   notification.
4. JavaScript reloads services and updates the active-service statistic.

### Update service

1. User chooses a status in the service card.
2. JavaScript sends `PUT /services/{id}` with status and notes.
3. API verifies service ownership and commits changes.
4. JavaScript reloads the service list.

### Run prediction

1. User selects a car and enters months since service.
2. JavaScript sends `POST /prediction/`.
3. API authenticates the user and verifies car ownership.
4. Backend computes age and calls `predict_service`.
5. Result is persisted in `predictions`.
6. JavaScript renders the gauge, verdict, risk factors, and recommendations.
7. History is reloaded.

### View history

`loadPredictions()` loops through the user's cars, requests
`GET /prediction/history/{car_id}`, merges car names, sorts by date, and renders
the cards. The current implementation skips an individual history request error
inside the loop; this is convenient for empty histories but could hide a genuine
server error.

### Logout

`clearToken()` removes `access_token` from localStorage and navigates to
`login.html`. The server does not maintain a token revocation list.

## 28. Background tasks and notifications

After a service is committed, `background_tasks.add_task(send_notification, ...)`
asks FastAPI to run the function after the response work is scheduled. The
function appends a line such as:

```text
Service 12 booked for user alex
```

to `service_notifications.txt` in the process working directory.

This is not an email service and does not provide delivery guarantees, retries,
authentication, or multi-process coordination. Production code would use a
durable queue and an email, SMS, or push provider.

## 29. Omni/Omniroute reality check

The actual application source contains no imports or calls to Omniroute, OpenAI,
Gemini, external AI APIs, or AI agents. The only project reference is in this
documentation's optional development setup.

Accurate viva answer:

> AutoCare AI runs locally with FastAPI, SQLite, and a serialized scikit-learn
> model. Omniroute was a development or monitoring tool in the setup instructions;
> it is not part of the runtime request path and the application does not require
> it to run.

If Omniroute is not running, the FastAPI application still starts and prediction
still uses `ml/model.pkl`.

## 30. Implemented versus documented versus future

### Implemented in source

- FastAPI API and static frontend serving
- JWT login and registration
- PBKDF2-SHA256 password hashing
- User-scoped car CRUD
- Service booking and status update
- File-based background notification
- scikit-learn prediction and database history
- Hybrid probability/risk interpretation
- Responsive vanilla frontend

### Present but not fully active

- `admin_required()` exists but no route uses it.
- `RegisterRequest` and `LoginRequest` exist but auth endpoints manually parse
  request bodies instead of using them.
- `app/utils.py` exists but is empty and unused.

### Not implemented; future work

- Real-world maintenance outcome dataset
- Real email/SMS notifications
- Mechanic/admin dashboard
- Server-side service-status enum
- Database migrations
- Refresh tokens and token revocation
- Rate limiting
- Automated full integration/browser test suite
- Model version metadata and monitoring

## 31. Complete technical demo script

### Step 1 — Open the application

**User sees:** loading page, then sign-in page.

**Internally:** FastAPI serves static files; `index.html` redirects; JavaScript
checks localStorage.

### Step 2 — Register

**User sees:** account-created status message.

**Internally:** `POST /auth/register` parses the body, checks the username,
hashes the password with PBKDF2-SHA256, inserts `User`, commits, and returns JSON.

### Step 3 — Sign in

**User sees:** dashboard with statistic cards.

**Internally:** login verifies the password, creates a JWT with `sub`, `role`, and
`exp`, stores it in localStorage, then redirects.

### Step 4 — Add a car

**User sees:** a new vehicle card.

**Internally:** `POST /cars/` validates the car payload, sets `owner_id`, commits
to SQLite, and JavaScript reloads the car list.

### Step 5 — Book service

**User sees:** a Booked service card and updated active-service count.

**Internally:** `POST /services/` checks ownership, inserts the service, schedules
the background notification, and returns the service ID.

### Step 6 — Update service

**User sees:** status badge changes.

**Internally:** `PUT /services/{id}` joins service to car, checks ownership,
updates status/notes, and commits.

### Step 7 — Run AI assessment

**User sees:** probability gauge, LOW/MEDIUM/HIGH label, verdict, reasons, and
recommendations.

**Internally:** `POST /prediction/` computes age, invokes the model and hybrid
formula, stores a prediction row, and returns JSON.

### Step 8 — Review history

**User sees:** newest prediction cards.

**Internally:** JavaScript requests history for each owned car, sorts by timestamp,
and renders escaped values.

### Step 9 — Edit/delete

**User sees:** updated card or removed card.

**Internally:** JavaScript sends PUT or DELETE with the bearer token; backend
rechecks ownership before changing SQLite.

### Step 10 — Logout

**User sees:** login page.

**Internally:** token is removed locally. A later dashboard request without a token
is redirected or receives 401.

## 32. Viva question bank

The following answers are intentionally based on this source code.

### Basic questions (15)

1. **What is the purpose of this project?**  
   **Short viva answer:** It manages a user's cars and maintenance services and
   estimates service risk using a scikit-learn model.  
   **If deeper:** Cars, services, predictions, and users are persisted in SQLite
   through SQLAlchemy.

2. **What is the technology stack?**  
   **Short viva answer:** FastAPI, Uvicorn, SQLAlchemy, SQLite, vanilla JavaScript,
   HTML/CSS, and scikit-learn.  
   **If deeper:** JWT and passlib handle authentication, while pandas/joblib
   support model training and loading.

3. **What starts the application?**  
   **Short viva answer:** Uvicorn imports `app.main:app` and serves it on port 8000.  
   **If deeper:** Import-time table creation, router registration, CORS, and static
   file mounting happen in `main.py`.

4. **Is this a monolith or microservices system?**  
   **Short viva answer:** It is a small modular monolith.  
   **If deeper:** API routers, database access, and ML inference run in one
   FastAPI process.

5. **Why use a virtual environment?**  
   **Short viva answer:** It isolates project dependencies and versions.  
   **If deeper:** It prevents this project's FastAPI and sklearn packages from
   interfering with other Python projects.

6. **What is a REST API?**  
   **Short viva answer:** It exposes resources through HTTP methods and URLs, such
   as GET cars and POST predictions.  
   **If deeper:** This project uses JSON request/response bodies and bearer
   authentication.

7. **What is JSON used for?**  
   **Short viva answer:** JSON is the data format exchanged between JavaScript and
   FastAPI.  
   **If deeper:** `apiFetch()` serializes request bodies and parses response text.

8. **What is CRUD?**  
   **Short viva answer:** Create, Read, Update, and Delete; the car router supports
   all four.  
   **If deeper:** Services and predictions have create/read/update or read-only
   history operations according to their business purpose.

9. **What is the role of Uvicorn?**  
   **Short viva answer:** It is the ASGI server that runs the FastAPI application.  
   **If deeper:** `--reload` watches files and restarts the development process.

10. **Why is the frontend called vanilla?**  
    **Short viva answer:** It uses browser HTML, CSS, and JavaScript without a
    framework or bundler.  
    **If deeper:** DOM queries, event listeners, fetch, and template strings handle
    the entire UI.

11. **What does `/health` do?**  
    **Short viva answer:** It returns a simple healthy status for monitoring.  
    **If deeper:** It does not run a database or model health test; it only returns
    the static health response.

12. **What does `/docs` provide?**  
    **Short viva answer:** FastAPI's automatically generated Swagger UI.  
    **If deeper:** It is built from registered routes and Pydantic request models.

13. **What does the dashboard statistic “Predictions” count?**  
    **Short viva answer:** It counts the prediction-history records loaded for the
    current user's cars.  
    **If deeper:** It is calculated client-side from `predictionsCache.length`.

14. **Are historical predictions recalculated automatically?**  
    **Short viva answer:** No. Each prediction row stores the result created at that
    time.  
    **If deeper:** New model logic affects new predictions, not old database rows.

15. **Is the ML output a guarantee?**  
    **Short viva answer:** No. It is an estimate from synthetic data and limited
    features.  
    **If deeper:** A mechanic and manufacturer schedule remain authoritative.

### Backend/FastAPI questions (15)

1. **Why FastAPI?**  
   **Short viva answer:** It provides typed request validation, dependency
   injection, async support, and automatic API documentation.  
   **If deeper:** This project uses router modularity, `Depends`, `HTTPException`,
   and `BackgroundTasks`.

2. **What is dependency injection here?**  
   **Short viva answer:** FastAPI supplies dependencies such as a database session
   and current user to endpoint functions.  
   **If deeper:** `get_db` and `get_current_user` are declared with `Depends`.

3. **Why use routers?**  
   **Short viva answer:** Routers separate authentication, cars, services, and ML
   responsibilities.  
   **If deeper:** Each router defines a prefix and tags and is included by main.

4. **What does `HTTPException` do?**  
   **Short viva answer:** It stops processing and returns an HTTP error status and
   detail message.  
   **If deeper:** The code uses 401, 404, 400, 403, and 422 for distinct cases.

5. **How does `get_db` work?**  
   **Short viva answer:** It creates a SQLAlchemy session, yields it to the
   request, and closes it in a finally block.  
   **If deeper:** This prevents sessions remaining open after request completion.

6. **Why call `db.refresh(car)` after commit?**  
   **Short viva answer:** It reloads database-generated values such as the new ID.  
   **If deeper:** The returned ORM object then reflects persisted database state.

7. **Why does the service list use a join?**  
   **Short viva answer:** It connects each service to its car so filtering can enforce
   car ownership.  
   **If deeper:** The query filters `Car.owner_id == user.id`.

8. **How does FastAPI serve the frontend?**  
   **Short viva answer:** `StaticFiles` mounts the physical frontend directory at
   `/static`.  
   **If deeper:** The browser uses the same origin and port as the API.

9. **Why is CORS configured?**  
   **Short viva answer:** It controls which browser origins may call the API.  
   **If deeper:** The project allows localhost and loopback on port 8000.

10. **Why does auth use `Request` instead of the Pydantic models?**  
    **Short viva answer:** The implementation manually supports JSON and browser
    form content types.  
    **If deeper:** This flexibility also means the imported auth schema length
    constraints are not automatically enforced.

11. **What is a background task?**  
    **Short viva answer:** It lets FastAPI schedule a small function after the
    endpoint's main work.  
    **If deeper:** Here it appends a booking line to a local text file.

12. **What is the purpose of `BackgroundTasks` here?**  
    **Short viva answer:** To demonstrate notification work without blocking the
    service booking response.  
    **If deeper:** It is not a durable queue or production notification system.

13. **What does `Base.metadata.create_all` do?**  
    **Short viva answer:** It creates mapped tables that do not already exist.  
    **If deeper:** It is not a migration system and does not safely evolve schemas.

14. **What is the API's main error-handling pattern?**  
    **Short viva answer:** It validates input and raises `HTTPException` for missing,
    unauthorized, or invalid resources.  
    **If deeper:** Frontend `apiFetch` converts non-2xx responses into JavaScript
    errors and status messages.

15. **What is a limitation of this backend?**  
    **Short viva answer:** It lacks migrations, rate limiting, strict service-status
    validation, and production notification infrastructure.  
    **If deeper:** Car deletion also lacks explicit ORM cascade configuration.

### Database/SQLAlchemy questions (10)

1. **What is an ORM?**  
   **Short viva answer:** It maps database tables to programming-language classes.  
   **If deeper:** SQLAlchemy lets the code query `Car` objects instead of writing
   every SQL statement manually.

2. **What is a primary key?**  
   **Short viva answer:** It uniquely identifies a row, such as `Car.id`.  
   **If deeper:** The IDs are integer primary keys generated by SQLite.

3. **What is a foreign key?**  
   **Short viva answer:** It links one table to another, such as `Car.owner_id` to
   `User.id`.  
   **If deeper:** `Service.car_id` and `Prediction.car_id` point to `cars.id`.

4. **What tables exist?**  
   **Short viva answer:** users, cars, services, and predictions.  
   **If deeper:** Relationships are User-to-Cars, Car-to-Services, and
   Car-to-Predictions.

5. **Why SQLite?**  
   **Short viva answer:** It is simple, file-based, and appropriate for a local
   prototype.  
   **If deeper:** PostgreSQL would be preferable for higher concurrency and
   production operations.

6. **How are sessions handled?**  
   **Short viva answer:** One SQLAlchemy session is supplied per request and closed
   afterward.  
   **If deeper:** `SessionLocal` is configured with the shared engine.

7. **How is a user restricted to their cars?**  
   **Short viva answer:** Queries include the authenticated user's `owner_id`.  
   **If deeper:** The check occurs server-side, independent of frontend controls.

8. **What happens if a wrong car ID is requested?**  
   **Short viva answer:** The ownership-filtered query finds nothing and returns
   404.  
   **If deeper:** This prevents ID substitution from exposing another user's car.

9. **Does the source explicitly configure cascade deletion?**  
   **Short viva answer:** No. The relationships do not specify ORM cascade options.  
   **If deeper:** Dependent-row cleanup should be explicitly designed and tested.

10. **Why are migrations useful?**  
    **Short viva answer:** They version schema changes safely across environments.  
    **If deeper:** `create_all` only creates missing tables and does not provide
    controlled alterations.

### Authentication/security questions (10)

1. **Are passwords stored plaintext?**  
   **Short viva answer:** No; passlib stores salted PBKDF2-SHA256 hashes.  
   **If deeper:** Verification hashes the supplied password and compares it safely.

2. **What is a salt?**  
   **Short viva answer:** A random value included in a password hash so equal
   passwords do not produce equal stored values.  
   **If deeper:** Passlib manages the salt and hash format.

3. **What is in the JWT?**  
   **Short viva answer:** Username in `sub`, role, and expiration in `exp`.  
   **If deeper:** It is signed with HS256 and the configured secret key.

4. **Where is the JWT stored?**  
   **Short viva answer:** In browser localStorage under `access_token`.  
   **If deeper:** This is convenient but an XSS vulnerability could expose it.

5. **What if the token expires?**  
   **Short viva answer:** JWT decoding fails and the API returns 401.  
   **If deeper:** The UI should log in again; there is no refresh-token mechanism.

6. **What is the bearer header?**  
   **Short viva answer:** `Authorization: Bearer <token>` carries the access token.  
   **If deeper:** OAuth2PasswordBearer extracts it for `get_current_user`.

7. **Can users access another user's car by changing the URL ID?**  
   **Short viva answer:** No; every protected car/service/history lookup checks
   ownership.  
   **If deeper:** A mismatch produces a not-found response rather than the record.

8. **Is CORS fully production secure?**  
   **Short viva answer:** It is suitable for the two local origins but too broad for
   a hardened production policy.  
   **If deeper:** Methods and headers are wildcarded.

9. **Is the secret key secure?**  
   **Short viva answer:** The current local `.env` has a generated secret, but it
   must be replaced and managed securely for deployment.  
   **If deeper:** Changing it invalidates existing tokens.

10. **What security improvements are needed?**  
    **Short viva answer:** Rate limiting, secure token storage, stricter validation,
    HTTPS, secret management, and audit logging.  
    **If deeper:** Add token revocation/refresh strategy and production CORS limits.

### Machine-learning questions (20)

1. **What is the target?**  
   **Short viva answer:** `service_required`, a binary 0/1 label.  
   **If deeper:** It is generated by an OR threshold rule.

2. **What features are used?**  
   **Short viva answer:** Car age, kilometers driven, and months since service.  
   **If deeper:** They are the exact columns passed to the saved pipeline.

3. **How is the dataset generated?**  
   **Short viva answer:** NumPy generates random values with seed 42, then an OR
   rule creates 1,500 labels.  
   **If deeper:** Age is 1-15, mileage 5,000-149,999, and months 1-24.

4. **Why is the dataset imbalanced?**  
   **Short viva answer:** The OR rule makes at least one condition true for most
   random rows.  
   **If deeper:** There are 1,390 positives and 110 negatives.

5. **What split is used?**  
   **Short viva answer:** 80% train and 20% test with stratification and seed 42.  
   **If deeper:** Stratification preserves class proportions.

6. **Why scale for Logistic Regression?**  
   **Short viva answer:** Age, mileage, and months have very different numeric
   ranges, so scaling makes optimization more balanced.  
   **If deeper:** `StandardScaler` is the first pipeline step.

7. **What does class_weight balanced do?**  
   **Short viva answer:** It gives more importance to the minority class during
   fitting.  
   **If deeper:** This reduces simply favoring the 93% positive class.

8. **Which final model is saved?**  
   **Short viva answer:** A StandardScaler plus balanced LogisticRegression pipeline.  
   **If deeper:** The script evaluates all models but deliberately saves Logistic
   Regression for smoother probabilities.

9. **Why not save the best F1 tree?**  
   **Short viva answer:** The trees score perfectly on this synthetic holdout but
   can produce pure 0/1 leaf probabilities.  
   **If deeper:** Continuous probabilities are more useful for risk presentation.

10. **What is overfitting?**  
    **Short viva answer:** Learning the training pattern too specifically and
    performing poorly on new data.  
    **If deeper:** Perfect scores on synthetic threshold data do not prove real
    maintenance accuracy.

11. **What is precision?**  
    **Short viva answer:** Of predicted service-required cases, how many were
    actually positive.  
    **If deeper:** Logistic Regression precision was 0.9961 on this holdout.

12. **What is recall?**  
    **Short viva answer:** Of actual service-required cases, how many were detected.  
    **If deeper:** Logistic Regression recall was 0.9245.

13. **What is F1?**  
    **Short viva answer:** The harmonic mean of precision and recall.  
    **If deeper:** Logistic Regression F1 was 0.9590.

14. **What is ROC-AUC?**  
    **Short viva answer:** It measures ranking quality across classification
    thresholds.  
    **If deeper:** Logistic Regression ROC-AUC was 0.9859.

15. **Why are tree metrics all 1.0?**  
    **Short viva answer:** The labels are created from simple threshold rules that
    trees can learn exactly.  
    **If deeper:** It reflects synthetic separability, not validated real-world
    prediction.

16. **What does Logistic Regression output?**  
    **Short viva answer:** A probability from a sigmoid applied to a weighted
    feature score.  
    **If deeper:** `predict_proba()[0][1]` is used as model probability.

17. **What does a Decision Tree output?**  
    **Short viva answer:** It follows feature splits to a leaf and predicts the
    majority class there.  
    **If deeper:** Leaf proportions can be exactly 0 or 1.

18. **What does Random Forest output?**  
    **Short viva answer:** It averages predictions from many randomized trees.  
    **If deeper:** The code uses 150 estimators and max depth 8.

19. **Can this model predict actual car failure?**  
    **Short viva answer:** No; it estimates service need from three synthetic-data
    features, not mechanical failure.  
    **If deeper:** Real service records and richer vehicle/usage features are
    required.

20. **Why is the hybrid layer needed?**  
    **Short viva answer:** It moderates synthetic model bias with understandable
    age, mileage, and service-interval pressures.  
    **If deeper:** Final probability uses 25% model signal and 75% maintenance
    pressure.

### Frontend/API questions (10)

1. **How does JavaScript call the API?**  
   **Short viva answer:** `apiFetch()` uses browser `fetch()` with the API base URL.  
   **If deeper:** It serializes JSON, attaches the bearer header, parses text, and
   throws on non-2xx responses.

2. **What is `carsCache`?**  
   **Short viva answer:** An in-memory array containing the current user's cars.  
   **If deeper:** It drives cards and select options.

3. **What is `servicesCache`?**  
   **Short viva answer:** The loaded service array used for rendering and searching.  
   **If deeper:** Each service is temporarily merged with `_car` display information.

4. **What is `predictionsCache`?**  
   **Short viva answer:** The combined prediction-history array for all loaded cars.  
   **If deeper:** It also drives prediction counts and latest car risk badges.

5. **How are errors shown?**  
   **Short viva answer:** API errors become status messages or toast notifications.  
   **If deeper:** `apiFetch` extracts `detail` or `message` from error JSON.

6. **Why escape HTML?**  
   **Short viva answer:** To prevent API values from being interpreted as markup.  
   **If deeper:** `escapeHtml()` is used when rendering names, notes, and labels.

7. **How does the service search work?**  
   **Short viva answer:** It filters the cached service type, status, and car name
   client-side.  
   **If deeper:** It re-renders without making a new API request.

8. **How does the dashboard update after a mutation?**  
   **Short viva answer:** It calls the relevant load function again and re-renders.  
   **If deeper:** This keeps the cache and summary statistics synchronized.

9. **How is the gauge animated?**  
   **Short viva answer:** It initially renders at zero width and changes width after
   `requestAnimationFrame` and a short timeout.  
   **If deeper:** CSS transitions provide the visual animation.

10. **What happens with an expired token?**  
    **Short viva answer:** Protected calls return 401 and the user must sign in
    again.  
    **If deeper:** The client does not implement refresh or revocation.

### Architecture questions (10)

1. **Describe the prediction path.**  
   **Short viva answer:** Frontend sends JWT and car/month data, router verifies
   ownership, ML service calculates risk, database stores it, and JSON returns.  
   **If deeper:** Age is computed server-side; only months is user supplied.

2. **Why keep ML inference in a separate module?**  
   **Short viva answer:** It separates model loading and scoring from HTTP routing.  
   **If deeper:** `prediction.py` handles authorization/persistence while
   `ml_service.py` handles inference and interpretation.

3. **Why serve frontend and API together?**  
   **Short viva answer:** It simplifies local deployment and avoids cross-origin
   frontend hosting.  
   **If deeper:** The same port also makes `API_BASE` straightforward.

4. **Where is business logic located?**  
   **Short viva answer:** Routers handle request/business workflows, models persist
   data, and ML service handles prediction interpretation.  
   **If deeper:** The design is modular but not a multi-layer enterprise service.

5. **What is the data flow for a service?**  
   **Short viva answer:** Form -> service router -> car ownership query -> service
   insert -> background notification -> JSON -> UI reload.  
   **If deeper:** The service starts with status `Booked`.

6. **What is the system's trust boundary?**  
   **Short viva answer:** The backend is trusted to authenticate and enforce
   ownership; frontend values are untrusted input.  
   **If deeper:** The API must not rely on hidden fields or UI restrictions.

7. **Why does the backend compute car age?**  
   **Short viva answer:** It avoids trusting a client-provided age and keeps age
   derived from stored year and current UTC year.  
   **If deeper:** This is the feature passed to the model.

8. **How does the system remain modular?**  
   **Short viva answer:** Routers separate domains and relationships connect ORM
   models.  
   **If deeper:** `main.py` is the composition root.

9. **What is the deployment bottleneck?**  
   **Short viva answer:** SQLite and file notifications are suited to local usage,
   not high-concurrency production.  
   **If deeper:** A managed database and durable messaging would be needed.

10. **What is the most important architecture limitation?**  
    **Short viva answer:** There is no separate service layer, migration layer, or
    production infrastructure around the simple prototype.  
    **If deeper:** The application is functional but intentionally lightweight.

### Tricky examiner questions (15)

1. **Is this really AI?**  
   **Short viva answer:** It uses machine learning, specifically scikit-learn
   classification, but it is a small predictive prototype rather than generative
   AI.  
   **If deeper:** The saved model is a Logistic Regression pipeline.

2. **Is the dataset real?**  
   **Short viva answer:** No. `generate_dataset.py` creates synthetic rows from an
   OR threshold rule.  
   **If deeper:** Therefore the reported metrics cannot be generalized to real
   vehicles.

3. **Why did the old model show 100%?**  
   **Short viva answer:** A decision tree can select pure leaves, and the synthetic
   labels were highly separable.  
   **If deeper:** The saved model was changed to Logistic Regression and final
   probabilities are clipped/blended.

4. **Why can model probability be 98% while final probability is 42%?**  
   **Short viva answer:** The hybrid layer intentionally gives the learned signal
   only 25% weight and combines it with maintenance pressures.  
   **If deeper:** This moderates synthetic age-driven bias.

5. **Is 42% calibrated probability?**  
   **Short viva answer:** No; it is a blended risk estimate, not a statistically
   calibrated failure probability.  
   **If deeper:** Calibration on representative real outcomes is future work.

6. **Why does the UI show old HIGH records?**  
   **Short viva answer:** History is append-only; old rows preserve results created
   before the logic changed.  
   **If deeper:** New assessments use current code.

7. **Can a user delete another user's car?**  
   **Short viva answer:** The car query includes both ID and owner ID, so no.  
   **If deeper:** A mismatch returns 404.

8. **Does the backend validate password length?**  
   **Short viva answer:** The Pydantic schema declares limits, but the current auth
   router manually parses `Request`, so those limits are not automatically applied.  
   **If deeper:** This should be fixed by binding the schemas or adding explicit
   validation.

9. **Can the backend accept an invalid service status?**  
   **Short viva answer:** Yes, currently `status` is a plain string.  
   **If deeper:** The UI offers four values, but the server does not enforce them.

10. **Does deleting a car delete all history?**  
    **Short viva answer:** Explicit cascade cleanup is not configured in the source,
    so this must not be claimed without testing and a deliberate database policy.  
    **If deeper:** Add ORM/database cascade behavior and integration tests.

11. **Why use both model and rules?**  
    **Short viva answer:** The model recognizes learned patterns while rules make
    practical risk drivers explicit and moderate synthetic bias.  
    **If deeper:** The hand-chosen weights are a limitation.

12. **What happens if the ML file is missing?**  
    **Short viva answer:** Importing `ml_service.py` raises `FileNotFoundError` and
    the application cannot start normally.  
    **If deeper:** Run `ml/train_model.py` from the project root.

13. **Does Omniroute power the prediction?**  
    **Short viva answer:** No. Runtime prediction loads local `ml/model.pkl`; no
    Omniroute import exists in the application.  
    **If deeper:** Omniroute is optional development/monitoring setup only.

14. **What would you improve first?**  
    **Short viva answer:** Replace the synthetic dataset with real labeled service
    outcomes and evaluate with cross-validation and calibration.  
    **If deeper:** Then add model versioning and explainability.

15. **Why should we trust this prediction?**  
    **Short viva answer:** It should not be treated as a guaranteed diagnosis; it is
    a transparent maintenance estimate for demonstration.  
    **If deeper:** Manufacturer schedules and qualified inspection remain primary.

## 33. Ten things to remember before the viva

1. The project is a modular FastAPI monolith serving a vanilla frontend.
2. Uvicorn starts `app.main:app` on port 8000.
3. SQLite is accessed through SQLAlchemy sessions supplied by `get_db`.
4. JWT uses HS256; passwords use salted PBKDF2-SHA256.
5. Ownership checks are enforced in backend queries with `owner_id`.
6. The four tables are users, cars, services, and predictions.
7. The ML features are age, mileage, and months since service.
8. The dataset is synthetic, imbalanced, and generated by an OR rule.
9. The saved model is a scaled, class-balanced Logistic Regression pipeline.
10. The final displayed risk is a hybrid estimate, not a guaranteed probability.

## 34. Ten most likely viva questions

1. Explain the complete architecture and prediction flow.
2. Why did you choose FastAPI and SQLAlchemy?
3. How does JWT authentication work in this project?
4. How are passwords hashed and verified?
5. How do you prevent one user from seeing another user's car?
6. What are the tables and relationships?
7. How was the ML dataset generated?
8. Why is the dataset not suitable as real-world evidence?
9. Why is Logistic Regression saved instead of the perfect-F1 tree?
10. Explain the exact hybrid prediction formula and risk thresholds.

## 35. Five questions that expose memorized documentation

1. **The schema says passwords are 6-72 characters. Where is that actually enforced?**  
   Correct answer: the current auth router manually parses `Request` and does not
   bind the imported Pydantic auth schemas, so those limits are not automatically
   enforced server-side.

2. **What happens to services and predictions when a car is deleted?**  
   Correct answer: the endpoint deletes the car, but explicit ORM cascade behavior
   is not configured in the source and should not be claimed without verification.

3. **Why can the model probability be 98% but the displayed final probability be
   42%?**  
   Correct answer: the hybrid formula weights model probability at 25% and
   maintenance pressure at 75%.

4. **Does Omniroute participate in a prediction request?**  
   Correct answer: no. The runtime imports joblib and loads local `ml/model.pkl`;
   there are no Omniroute or external AI imports.

5. **Can the service endpoint reject an arbitrary status string?**  
   Correct answer: not currently. `ServiceUpdate.status` is a plain string and
   server-side enum validation is a future improvement.

## 36. Final one-page memory sheet

```text
PROJECT:
AutoCare AI, a Smart Car Service Management System.

STACK:
FastAPI + Uvicorn + SQLAlchemy + SQLite + JWT + PBKDF2-SHA256
+ vanilla HTML/CSS/JavaScript + pandas/scikit-learn/joblib.

ARCHITECTURE:
Browser -> fetch/API -> JWT dependency -> router -> SQLite or ML service
-> JSON -> dashboard re-render.

TABLES:
users, cars, services, predictions.
User owns Cars; Car has Services and Predictions.

AUTH:
POST /auth/register and /auth/login.
JWT claims: sub, role, exp. Token stored in localStorage and sent as
Authorization: Bearer <token>.

API:
/health, /docs, /auth/register, /auth/login, /cars/, /cars/{id},
/services/, /services/{id}, /prediction/, /prediction/history/{car_id}.

ML:
Features: car_age, km_driven, months_since_service.
Synthetic dataset: 1,500 rows; 1,390 positives and 110 negatives.
Label rule: age >= 7 OR km >= 70,000 OR months >= 10.
Models tested: balanced Logistic Regression, Decision Tree, Random Forest.
Saved model: StandardScaler + balanced LogisticRegression(max_iter=1000).

HYBRID FORMULA:
age_pressure = clamp((age - 10)/8, 0, 1)
mileage_pressure = clamp((km - 60000)/100000, 0, 1)
months_pressure = clamp(months/12, 0, 1)
maintenance = .20 age + .40 mileage + .40 months
final = .25 model_probability + .75 maintenance
final clipped to 0.02-0.98.

RISK:
HIGH >= .75; MEDIUM >= .45; LOW otherwise.
Verdict: Service Required when final >= .50.

LIMITATIONS:
Synthetic data, only three features, no calibrated real-world probability,
SQLite/local file notifications, localStorage token, weak auth schema binding,
no status enum, no migrations, no explicit cascade policy.

HONEST POSITION:
This is a working predictive-maintenance prototype. It estimates service need;
it does not diagnose mechanical failure or replace a mechanic.
Omniroute is not in the runtime architecture.
```
