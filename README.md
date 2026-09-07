# Full-Stack Pizza Ordering Application

A modern, full-stack pizza delivery web application built with a Node.js/Express/MongoDB backend and a React/Vite frontend.

---

## 📁 Repository Structure

```
pizza-delivery/
├── README.md
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── config/           # Database & third-party service configurations
│       ├── controllers/      # Route controllers
│       ├── middleware/       # Auth, validation, rate limiting & error handlers
│       ├── models/           # Mongoose schemas & data models
│       ├── routes/           # Express API route declarations
│       ├── services/         # Email, cron jobs & background services
│       ├── utils/            # Helper utilities and loggers
│       └── server.js         # Backend server entry point
└── frontend/
    ├── .env.example
    ├── .env
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── assets/           # Static assets (images, icons)
        ├── components/       # Reusable UI components
        │   ├── common/       # Global reusable components
        │   ├── pizza/        # Pizza builder & card components
        │   ├── cart/         # Cart modal and items
        │   ├── order/        # Order summary & tracking UI
        │   └── admin/        # Admin management tables & forms
        ├── context/          # React Context (Auth, Cart, Socket)
        ├── hooks/            # Custom React hooks
        ├── pages/            # View pages (Home, Menu, Custom Pizza, Orders, etc.)
        ├── services/         # Axios API clients
        ├── utils/            # Formatting and helper utilities
        ├── App.jsx           # App root component with routing
        ├── index.css         # Global design system & styles
        └── main.jsx          # React DOM entry point
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22/v26)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas URI

---

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the local `.env` configuration file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

4. Configure your environment variables in `backend/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/pizza-delivery
   CLIENT_URL=http://localhost:5173
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_password
   EMAIL_FROM=noreply@pizzadelivery.com
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`. You can verify it with `GET http://localhost:5000/api/health`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the local `.env` configuration file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

4. Verify your environment variables in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   ```

5. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will run at `http://localhost:5173`.

---

## 🛠️ Health Check

To verify the backend is up and running:
```bash
curl http://localhost:5000/api/health
```
Response:
```json
{
  "status": "ok"
}
```
