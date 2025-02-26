# Time Management System

## Overview
This Express.js application provides APIs for managing facilitators and support tickets, utilizing Firebase for authentication and data storage. The application runs on a configurable port and includes CORS support.

## Features
- Firebase Authentication
- User Role Management (Super Admin, Facilitator, Trainee)
- Support Ticket System
- CRUD Operations for Tickets and Users
- Real-time Updates with Firestore
- Middleware Authentication
- Role-based Access Control

## Prerequisites
- Node.js (v14 or higher)
- Firebase Account
- npm or yarn package manager

## Installation


1. Install dependencies
```bash
npm install
```

2. Create a `.env` file in the root directory and add the following configurations:
```env
PORT=4000
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id


## API Routes

### Authentication Routes
- `POST /api/login - Login with email and password
- `POST /api/loginT - Login as a trainee
- `POST /api/enable-2fa - Enable 2FA for the user
- `POST /api/verify-2fa - Verify the 2FA code
- `POST /api/disable-2fa - Disable 2FA for the user

### Facilitator Routes
- `POST /api/facilitators` - Create new facilitator (Super Admin only)
- `GET /api/facilitators` - Get all facilitators
- `GET /api/facilitators/:id` - Get specific facilitator
- `PUT /api/facilitators/:id` - Update facilitator
- `DELETE /api/facilitators/:id` - Delete facilitator (Super Admin only)
- `POST /api/facilitators/change-password` - Change facilitator password

### Ticket Routes
#### Facilitator Endpoints
- `GET /api/tickets` - Get all tickets
- `GET /api/tickets/:id` - Get specific ticket
- `PUT /api/tickets/:id` - Update ticket status/priority

#### Trainee Endpoints
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets/my-tickets` - Get user's tickets
- `GET /api/tickets/my-tickets/:id` - Get specific user ticket
- `PUT /api/tickets/my-tickets/:id` - Update user's ticket
- `POST /api/tickets/my-tickets/:id/cancel` - Cancel user's ticket

## Running the Application

Development mode:
```bash
npm run server
```

Production mode:
```bash
npm start
```

## Two-Factor Authentication (2FA)
This system supports Two-Factor Authentication (2FA) for enhanced security. Users can enable 2FA, receive a verification code, and verify the code during login.

### Enabling 2FA
To enable 2FA for a user, the user must provide a phone number. The system will send a verification SMS to that phone number. Once verified, 2FA will be enabled for that user.

- Route: POST /api/enable-2fa
- Request Body:
```json
{
  "phoneNumber": "user_phone_number"
}
```

### Verifying 2FA
After successfully logging in with email and password, if 2FA is enabled, the user must enter the verification code sent via SMS to complete the login process.

- Route: POST /api/verify-2fa
- Request Body:
```json
{
  "verificationId": "verification_id_from_enable_2fa",
  "verificationCode": "user_provided_code"
}
```

### Disabling 2FA
A user can also disable 2FA. Once disabled, they will no longer be required to enter the verification code during login.

- Route: POST /api/disable-2fa
- Request Body:

```json
{}
```


## Security
- All routes are protected with Firebase Authentication
- Role-based access control implemented
- Super Admin privileges required for sensitive operations
- Password changes trigger Firebase Auth updates
- Two-Factor Authentication (2FA) is available for users who enable it

## Error Handling
The application includes comprehensive error handling for:
- Authentication errors
- Authorization errors
- Invalid requests
- Database operation failures
- Server errors

