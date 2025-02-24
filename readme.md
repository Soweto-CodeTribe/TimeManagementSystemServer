# Facilitator and Trainee Management API

A Node.js/Express API that interfaces with Firebase for authentication and data storage, implementing a role-based access control system for managing facilitators, trainees, and support tickets.

## 📋 Table of Contents
- [Overview]
- [Features]
- [Getting Started]
  - [Prerequisites]
  - [Installation]
  - [Configuration]
- [API Documentation]
- [Data Models]
- [Security]
- [Best Practices]
- [Contributing]
- [License]

## 🔍 Overview

This API provides a complete backend solution for educational or training platforms that need to manage facilitators, trainees, and a support ticket system. It uses Firebase Authentication for user management and Firestore for data storage.

## ✨ Features

- **User Management**: Create and manage facilitator and trainee accounts
- **Role-Based Access Control**: Different permissions for facilitators and trainees
- **Location-Based Filtering**: Facilitators can access trainees based on their location
- **Support Ticket System**: Trainees can create tickets, facilitators can manage them
- **Secure Authentication**: Firebase Authentication with password reset functionality
- **Data Validation**: Input validation for all API endpoints

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Firebase project with Authentication and Firestore enabled

### Installation


1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your Firebase configuration.

### Configuration

Create a file named `firebaseConfig.js` in the `config` directory:

```javascript
// config/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, serverTimestamp };
```

## 📖 API Documentation

### Facilitator Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/facilitators` | Create a new facilitator account |
| GET | `/facilitators` | Get all facilitators |
| GET | `/facilitators/:id` | Get facilitator by ID |
| PUT | `/facilitators/:id` | Update facilitator information |

### Trainee Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trainees` | Get all trainees |
| GET | `/trainees/location` | Get trainees by facilitator location |
| POST | `/trainees` | Create a new trainee account |
| PUT | `/trainees/profile` | Update trainee profile |
| GET | `/trainees/profile` | Get trainee profile |

### Ticket Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tickets` | Create a new support ticket |
| GET | `/tickets` | Get all tickets (facilitator view) |
| GET | `/tickets/:id` | Get ticket by ID (facilitator view) |
| PUT | `/tickets/:id` | Update ticket (facilitator view) |
| GET | `/tickets/my` | Get my tickets (trainee view) |
| PUT | `/tickets/my/:id` | Update my ticket (trainee view) |
| PUT | `/tickets/my/:id/cancel` | Cancel my ticket (trainee view) |

## 📊 Data Models

### Facilitator Model
```javascript
{
    uid: string,          // Firebase Auth UID
    surname: string,
    name: string,
    email: string,
    location: string,
    role: string,         // Default: 'facilitator'
    createdAt: timestamp,
    updatedAt: timestamp
}
```

### Trainee Model
```javascript
{
    traineeId: number,    // Auto-incrementing ID
    uid: string,          // Firebase Auth UID
    name: string,
    surname: string,
    age: number,
    gender: string,
    phoneNumber: string,
    idNumber: string,
    email: string,
    location: string,
    createdAt: timestamp,
    updatedAt: timestamp
}
```

### Ticket Model
```javascript
{
    title: string,
    description: string,
    category: string,
    priority: string,     // Default: 'medium'
    status: string,       // 'open', 'resolved', 'closed'
    submittedBy: string,  // User UID
    assignedTo: string,   // Facilitator UID
    createdAt: timestamp,
    updatedAt: timestamp
}
```

## 🔒 Security

- Temporary passwords are generated using crypto for new users
- Password reset emails are automatically sent upon account creation
- Role-based access control is strictly enforced
- Location-based access control for facilitators
- Proper authentication checks before any database operation

## 💡 Best Practices

1. Always use authentication middleware to verify user sessions
2. Implement proper error handling using try-catch blocks
3. Validate input data before database operations
4. Use transaction for operations that require atomic updates
5. Convert timestamps to ISO strings before sending responses
6. Implement proper access control checks for all operations
7. Archive deleted records instead of permanent deletion

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
