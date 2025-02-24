# Geofencing API Documentation

## Overview
This API provides endpoints for managing geofenced locations and validating user positions within allowed areas. All endpoints require authentication via a JWT token (`verifyToken` middleware). Most endpoints also require super admin privileges (`isSuperAdmin` middleware).

## Base URL
```
/api/geofencing
```

## Authentication
- All requests must include a valid JWT token in the Authorization header:
  ```
  Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Add Allowed Location
Creates a new geofenced location.

**Endpoint:** `POST /locations`  
**Access:** Super Admin only

**Request Body:**
```json
{
  "name": "Office Building",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "radius": 100,
  "description": "Main office location" // optional
}
```

**Response (201 Created):**
```json
{
  "id": "location_id",
  "name": "Office Building",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "radius": 100,
  "description": "Main office location",
  "createdAt": "2024-02-24T12:00:00Z",
  "active": true
}
```

### 2. Get All Allowed Locations
Retrieves all configured geofenced locations.

**Endpoint:** `GET /locations`  
**Access:** Super Admin only

**Response (200 OK):**
```json
[
  {
    "id": "location_id",
    "name": "Office Building",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "radius": 100,
    "description": "Main office location",
    "createdAt": "2024-02-24T12:00:00Z",
    "active": true
  }
]
```

### 3. Validate User Location
Checks if a user's location is within any allowed geofenced area.

**Endpoint:** `POST /validate-location`  
**Access:** Any authenticated user

**Request Body:**
```json
{
  "userId": "user_id",
  "latitude": 51.5074,
  "longitude": -0.1278
}
```

**Success Response (200 OK):**
```json
{
  "allowed": true,
  "location": "Office Building",
  "distance": 45 // distance in meters from location center
}
```

**Failure Response (403 Forbidden):**
```json
{
  "allowed": false,
  "message": "Location not within allowed area",
  "nearestLocation": "Office Building",
  "distance": 150, // current distance in meters
  "requiredDistance": 100 // maximum allowed distance in meters
}
```

### 4. Update Allowed Location
Updates an existing geofenced location.

**Endpoint:** `PUT /locations/:id`  
**Access:** Super Admin only

**URL Parameters:**
- `id`: Location ID

**Request Body:**
```json
{
  "name": "Updated Office Name",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "radius": 150,
  "description": "Updated description",
  "active": true
}
```
All fields are optional. Only provided fields will be updated.

**Response (200 OK):**
```json
{
  "id": "location_id",
  "name": "Updated Office Name",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "radius": 150,
  "description": "Updated description",
  "active": true,
  "updatedAt": "2024-02-24T12:00:00Z"
}
```

### 5. Delete Allowed Location
Removes a geofenced location.

**Endpoint:** `DELETE /locations/:id`  
**Access:** Super Admin only

**URL Parameters:**
- `id`: Location ID

**Response (200 OK):**
```json
{
  "message": "Location deleted successfully"
}
```

### 6. Get Location Logs
Retrieves history of location validation attempts.

**Endpoint:** `GET /location-logs`  
**Access:** Super Admin only

**Response (200 OK):**
```json
[
  {
    "id": "log_id",
    "userId": "user_id",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "timestamp": "2024-02-24T12:00:00Z",
    "isAllowed": true,
    "nearestLocationName": "Office Building",
    "distanceToNearest": 45
  }
]
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Missing required fields"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid or missing token"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "Location not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to [operation]",
  "details": "Error message"
}
```

## Notes
- All coordinates use decimal degrees (e.g., 51.5074°N, 0.1278°W)
- Radius is specified in meters
- Distances in responses are rounded to the nearest meter
- The `active` flag in locations can be used to temporarily disable a geofence without deleting it
- Location logs are automatically created for each validation attempt
