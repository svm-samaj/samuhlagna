# URL Management System

This document explains how to use the centralized URL management system for the SVMPS frontend application.

## Overview

The `fetchurl.jsx` file provides a centralized way to manage all API URLs for both development and production environments. This system eliminates hardcoded URLs throughout the application and makes environment switching seamless.

## Files Structure

```
frontend/
├── .env                    # Environment variables (development)
├── .env.production        # Production environment variables
└── src/
    └── utils/
        └── fetchurl.jsx   # Central URL management
```

## Environment Variables

### Development (.env)
```
VITE_NODE_ENV=development
VITE_DEV_API_URL=http://127.0.0.1:8000
VITE_PROD_API_URL=https://svmps-frontend.onrender.com
```

### Production (.env.production)
```
VITE_NODE_ENV=production
VITE_PROD_API_URL=https://svmps-frontend.onrender.com
```

## Usage in Components

### Import the API_URLS

```jsx
import { API_URLS } from "../../../utils/fetchurl";
```

### Use centralized URLs

```jsx
// Instead of hardcoded URLs
// await axios.get("https://svmps-frontend.onrender.com/user_data/");

// Use centralized URLs
await axios.get(API_URLS.getAllUsers());
await axios.post(API_URLS.createUser(), userData);
await axios.put(API_URLS.updateUser(userId), updateData);
await axios.delete(API_URLS.deleteUser(userId));
```

## Available API URLs

### Users
- `API_URLS.getAllUser_data()` - GET /user_data/
- `API_URLS.getUser_dataById(id)` - GET /user_data/{id}
- `API_URLS.createUser_data()` - POST /user_data/
- `API_URLS.updateUser_data(id)` - PUT /user_data/{id}
- `API_URLS.deleteUser_data(id)` - DELETE /user_data/{id}

### Areas
- `API_URLS.getAllAreas()` - GET /area/
- `API_URLS.getAreaById(id)` - GET /area/{id}
- `API_URLS.createArea()` - POST /area/
- `API_URLS.deleteArea(id)` - DELETE /area/{id}

### Villages
- `API_URLS.getAllVillages()` - GET /village/
- `API_URLS.getVillageById(id)` - GET /village/{id}
- `API_URLS.createVillage()` - POST /village/
- `API_URLS.deleteVillage(id)` - DELETE /village/{id}

## Environment Detection

The system automatically detects the environment and uses the appropriate URL:

- **Development**: Uses `VITE_DEV_API_URL` (default: http://127.0.0.1:8000)
- **Production**: Uses `VITE_PROD_API_URL` (default: https://svmps-frontend.onrender.com)

## Environment Information

For debugging purposes, you can access environment information:

```jsx
import { ENV_INFO } from "../../../utils/fetchurl";

console.log("Current environment:", ENV_INFO.current);
console.log("Base URL:", ENV_INFO.baseUrl);
console.log("Is development:", ENV_INFO.isDevelopment());
console.log("Is production:", ENV_INFO.isProduction());
```

## Deployment Instructions

### Development
1. Ensure `.env` file exists with development settings
2. Run `npm run dev`

### Production
1. Set environment variables on your hosting platform:
   - `VITE_NODE_ENV=production`
   - `VITE_PROD_API_URL=https://svmps-frontend.onrender.com`
2. Build the application: `npm run build`
3. Deploy the built files

## Benefits

1. **Centralized Management**: All URLs in one place
2. **Environment Flexibility**: Easy switching between dev and prod
3. **Type Safety**: Centralized functions reduce typos
4. **Maintainability**: Easy to update URLs across the entire application
5. **Debugging**: Environment information readily available

## Adding New Endpoints

To add new API endpoints:

1. Add the endpoint to `API_ENDPOINTS` in `fetchurl.jsx`
2. Add corresponding functions to `API_URLS`
3. Use the new functions in your components

Example:
```jsx
// In fetchurl.jsx
export const API_ENDPOINTS = {
  // ... existing endpoints
  REPORTS: '/reports/',
  REPORT_BY_ID: (id) => `/reports/${id}`,
};

export const API_URLS = {
  // ... existing URLs
  getAllReports: () => getApiUrl(API_ENDPOINTS.REPORTS),
  getReportById: (id) => getApiUrl(API_ENDPOINTS.REPORT_BY_ID(id)),
};
```
