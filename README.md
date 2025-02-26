# Backend API Documentation

## Base URL

`https://timemanagementsystemserver.onrender.com`

## Authentication

### Login (Trainee)

**Endpoint:** `POST /api/auth/loginT`

**Request Body:**

```json
{
    "email": "example@gmail.com",
    "password": "blahblahblah23!"
}
```

**Response:**

```json
{
    "token": "<JWT_TOKEN>",
    "user": "example@gmail.com",
    "trainee": { <Trainee_Details> },
    "traineeReports": { <Trainee_Reports> }
}
```

---

### Super Admin Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
    "email": "superadmin@example.com",
    "password": "temporaryPassword123!"
}
```

---

## Attendance Management

### Check-In

**Endpoint:** `POST /api/session/check-in`

**Request Body:**

```json
{
    "traineeId": "10",
    "name": "John Doe",
    "location": "soweto",
    "checkIn": "08:00"
}
```

**Response:**

```json
{
    "message": "Check-in successful",
    "checkInTime": "08:29 AM"
}
```

**Authentication:** Requires Bearer Token

---

### Start Lunch Break

**Endpoint:** `POST /api/session/lunch-start`

**Request Body:**

```json
{
    "traineeId": "1",
    "lunchStart": "08:29 AM"
}
```

**Response:**

```json
{
    "message": "Lunch start recorded",
    "lunchStartTime": "08:30 AM"
}
```

**Authentication:** Requires Bearer Token

---

### End Lunch Break

**Endpoint:** `POST /api/session/lunch-end`

**Request Body:**

```json
{
    "traineeId": "1",
    "lunchEnd": "08:30 AM"
}
```

**Response:**

```json
{
    "message": "Lunch end recorded",
    "lunchEndTime": "08:30 AM",
    "lunchDurationMinutes": 3
}
```

**Authentication:** Requires Bearer Token

---

### Check-Out

**Endpoint:** `POST /api/session/check-out`

**Request Body:**

```json
{
    "traineeId": "1",
    "checkOut": "08:36 AM"
}
```

**Response:**

```json
{
    "message": "Check-out successful",
    "checkOutTime": "08:36 AM",
    "totalHoursWorked": "0.27",
    "totalLunchMinutes": 0
}
```

**Authentication:** Requires Bearer Token

---

## Trainee Management

### Get Trainees

**Endpoint:** `GET /api/trainees`

**Authentication:** Requires Bearer Token (Super Admin Only)

---

### Create Trainee

**Endpoint:** `POST /api/trainees`

**Request Body:**

```json
{
    "gender": "female",
    "surname": "Doekazi",
    "idNumber": "3001015123456",
    "phoneNumber": "+27123456789",
    "email": "johnkazi.doe@example.com",
    "name": "Johnkazi",
    "age": 25,
    "location": "soweto"
}
```

**Authentication:** Requires Bearer Token

---

### Update Trainee

**Endpoint:** `PUT /api/trainees/2`

**Request Body:** Same as "Create Trainee"

**Authentication:** Requires Bearer Token

---

## Facilitator Management

### Get Facilitators

**Endpoint:** `GET /api/facilitators`

**Authentication:** Requires Bearer Token (Super Admin Only)

---

### Create Facilitator

**Endpoint:** `POST /api/facilitators`

**Request Body:**

```json
{
    "surname": "KB",
    "name": "Vin",
    "email": "Vin@company.com",
    "location": "kimberly",
    "role": "facilitator"
}
```

**Authentication:** Requires Bearer Token (Super Admin Only)

---

### Update Facilitator

**Endpoint:** `POST /api/facilitators/:id`

**Request Body:** Same as "Create Facilitator"

**Authentication:** Requires Bearer Token (Super Admin Only)

---

## QR Code Verification

### Verify QR Code

**Endpoint:** `POST /api/QR/verify-QRcode`

**Request Body:**

```json
{
    "qrId": "1739951989684"
}
```

**Response:**

```json
{
    "success": true,
    "message": "QR Code verified"
}
```

**Authentication:** Requires Bearer Token (Super Admin Only)

---

## Session Status

### Get Session Status

**Endpoint:** `GET /api/session/session-status/:id`

**Request Body:**

```json
{
    "traineeId": "10"
}
```

**Response:**

```json
{
    "checkInTime": "08:29 AM",
    "lastUpdated": 1740551355049,
    "lunchStatus": "Working",
    "name": "John Doe"
}
```

**Authentication:** Requires Bearer Token (Super Admin Only)

# Backend API Documentation

## Base URL

`https://timemanagementsystemserver.onrender.com`

## Authentication

### Login (Trainee)

**Endpoint:** `POST /api/auth/loginT`

**Request Body:**

```json
{
    "email": "example@gmail.com",
    "password": "blahblahblah23!"
}
```

**Response:**

```json
{
    "token": "<JWT_TOKEN>",
    "user": "example@gmail.com",
    "trainee": { <Trainee_Details> },
    "traineeReports": { <Trainee_Reports> }
}
```

---

### Super Admin Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
    "email": "superadmin@example.com",
    "password": "temporaryPassword123!"
}
```

---

## Attendance Management

### Check-In

**Endpoint:** `POST /api/session/check-in`

**Request Body:**

```json
{
    "traineeId": "10",
    "name": "John Doe",
    "location": "soweto",
    "checkIn": "08:00"
}
```

**Response:**

```json
{
    "message": "Check-in successful",
    "checkInTime": "08:29 AM"
}
```

**Authentication:** Requires Bearer Token

---

### Start Lunch Break

**Endpoint:** `POST /api/session/lunch-start`

**Request Body:**

```json
{
    "traineeId": "1",
    "lunchStart": "08:29 AM"
}
```

**Response:**

```json
{
    "message": "Lunch start recorded",
    "lunchStartTime": "08:30 AM"
}
```

**Authentication:** Requires Bearer Token

---

### End Lunch Break

**Endpoint:** `POST /api/session/lunch-end`

**Request Body:**

```json
{
    "traineeId": "1",
    "lunchEnd": "08:30 AM"
}
```

**Response:**

```json
{
    "message": "Lunch end recorded",
    "lunchEndTime": "08:30 AM",
    "lunchDurationMinutes": 3
}
```

**Authentication:** Requires Bearer Token

---

### Check-Out

**Endpoint:** `POST /api/session/check-out`

**Request Body:**

```json
{
    "traineeId": "1",
    "checkOut": "08:36 AM"
}
```

**Response:**

```json
{
    "message": "Check-out successful",
    "checkOutTime": "08:36 AM",
    "totalHoursWorked": "0.27",
    "totalLunchMinutes": 0
}
```

**Authentication:** Requires Bearer Token

---

## Trainee Management

### Get Trainees

**Endpoint:** `GET /api/trainees`

**Authentication:** Requires Bearer Token (Super Admin Only)

---

### Create Trainee

**Endpoint:** `POST /api/trainees`

**Request Body:**

```json
{
    "gender": "female",
    "surname": "Doekazi",
    "idNumber": "3001015123456",
    "phoneNumber": "+27123456789",
    "email": "johnkazi.doe@example.com",
    "name": "Johnkazi",
    "age": 25,
    "location": "soweto"
}
```

**Authentication:** Requires Bearer Token

---

### Update Trainee

**Endpoint:** `PUT /api/trainees/2`

**Request Body:** Same as "Create Trainee"

**Authentication:** Requires Bearer Token

---

## Facilitator Management

### Get Facilitators

**Endpoint:** `GET /api/facilitators`

**Authentication:** Requires Bearer Token (Super Admin Only)

---

### Create Facilitator

**Endpoint:** `POST /api/facilitators`

**Request Body:**

```json
{
    "surname": "KB",
    "name": "Vin",
    "email": "Vin@company.com",
    "location": "kimberly",
    "role": "facilitator"
}
```

**Authentication:** Requires Bearer Token (Super Admin Only)

---

### Update Facilitator

**Endpoint:** `POST /api/facilitators/:id`

**Request Body:** Same as "Create Facilitator"

**Authentication:** Requires Bearer Token (Super Admin Only)

---

## QR Code Verification

### Verify QR Code

**Endpoint:** `POST /api/QR/verify-QRcode`

**Request Body:**

```json
{
    "qrId": "1739951989684"
}
```

**Response:**

```json
{
    "success": true,
    "message": "QR Code verified"
}
```

**Authentication:** Requires Bearer Token (Super Admin Only)

---

## Session Status

### Get Session Status

**Endpoint:** `GET /api/session/session-status/:id`

**Request Body:**

```json
{
    "traineeId": "10"
}
```

**Response:**

```json
{
    "checkInTime": "08:29 AM",
    "lastUpdated": 1740551355049,
    "lunchStatus": "Working",
    "name": "John Doe"
}
```

**Authentication:** Requires Bearer Token (Super Admin Only)

