# PocketExpense+ - Full-Stack Expense Tracker

A premium expense tracking mobile application with **Violet Glassmorphism** design, offline synchronization, and comprehensive spending insights.

## Tech Stack

### Frontend (React Native / Expo)
- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Redux Toolkit
- **Styling**: Custom Violet Glassmorphism theme with Poppins font

### Backend (Node.js / Express)
- **Runtime**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)

## Features

- 🔐 **Authentication**: User registration and login with JWT
- 💰 **Expense Management**: Full CRUD operations for expenses/income
- 📊 **Analytics**: Monthly/daily spending charts and insights
- 🔄 **Offline Sync**: Local-first data with background synchronization
- 💸 **Budget Alerts**: Overspending notifications
- 🎨 **Premium UI**: Violet Glassmorphism design with smooth animations

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Expo CLI

### Backend Setup

1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/pocketexpense
   JWT_SECRET=your_secret_key
   JWT_EXPIRE=30d
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Install dependencies (from root directory):
   ```bash
   npm install
   ```

2. Update API URL in `src/store/api/apiClient.ts` if needed

3. Start Expo:
   ```bash
   npm start
   ```

4. Scan QR code with Expo Go app or run on simulator

## Project Structure

```
├── app/               # Expo Router screens
│   ├── (auth)/        # Auth screens (login, register)
│   ├── (tabs)/        # Tab screens (home, transactions, analytics, account)
│   └── expense/       # Expense modals (add, edit)
├── src/
│   ├── components/    # Reusable UI components
│   ├── store/         # Redux store and slices
│   ├── services/      # Sync engine and API services
│   ├── theme/         # Design system tokens
│   └── utils/         # Helper functions
└── server/            # Backend API
    ├── config/        # Database configuration
    ├── controllers/   # Route handlers
    ├── middleware/    # Auth middleware
    ├── models/        # Mongoose schemas
    └── routes/        # API routes
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/expenses` | Get user expenses |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/expenses/insights` | Get spending analytics |
| POST | `/api/expenses/sync` | Bulk sync offline data |

## Design System

The app uses a **Violet Glassmorphism** theme:
- Primary: `#8A64EB`
- Background: `#F8F9FE`
- Cards: White with soft shadows
- Typography: Poppins font family
