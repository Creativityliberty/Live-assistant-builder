# Live Assistant Backend

This is the Python backend for the Live Assistant Builder. It uses **FastAPI** to serve configuration data to the React frontend.

## 🚀 Setup & Run

### 1. Install Dependencies
Make sure you have Python 3.9+ installed.

```bash
pip install -r requirements.txt
```

### 2. Start the Server
Run the following command to start the backend server:

```bash
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`.

- API Documentation (Swagger UI): `http://localhost:8000/docs`
- Config Endpoint: `http://localhost:8000/api/config`

## 🔗 Connecting to the UI

To connect this backend to the React frontend, you would update the frontend to fetch data from this API instead of using the local state.

### Example Implementation for Frontend

In your `App.tsx` (or a new `services/api.ts` file), you can add:

```typescript
const API_URL = "http://localhost:8000";

// Load Config
export async function fetchConfig() {
  const response = await fetch(`${API_URL}/api/config`);
  return response.json();
}

// Save Config
export async function saveConfig(config) {
  await fetch(`${API_URL}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
}
```

Then in `App.tsx`:

```typescript
useEffect(() => {
  fetchConfig().then(savedConfig => setConfig(savedConfig));
}, []);
```

## 🛠 Features

- **CORS Enabled**: Configured to accept requests from any origin (development mode).
- **Type Safety**: Uses Pydantic models that match the frontend TypeScript interfaces.
- **RESTful API**: Standard GET/POST endpoints for configuration management.
