# 💰 Expense Tracker

A modern personal finance and expense management mobile application built with **React Native (Expo)**, **Node.js**, **Express**, and **MongoDB Atlas**. It features automated bank balance tracking, interactive spending analytics, AI receipt scanning, and smart bank SMS detection.

---

## ✨ Features

- 🏦 **Authoritative Bank Balance**: Set an opening balance on signup. Confirmed income and expenses automatically and atomically adjust your balance.
- 📊 **Financial Analytics & Trends**:
  - **Daily Spending Trend**: Smooth curved daily graph with tooltips and horizontal scrolling.
  - **Income vs Expense**: Side-by-side comparison with flexible filters (*This Week*, *This Month*, *Last 3/6/12 Months*).
  - **Category Breakdown**: Interactive donut chart and ranked expense list.
- 🧾 **AI Smart Receipt Scan**: Take a photo of any receipt; Google Gemini AI extracts merchant, amount, category, and date automatically.
- 📱 **Bank SMS Auto-Detection**: Automatically detects incoming bank and UPI alerts (Android), parses amount and merchant, and queues them for 1-tap confirmation.
- 🛡️ **Safe-to-Spend Today**: Calculates your daily recommended budget based on recurring bills and savings targets.
- 🌙 **Dark & Light Mode**: Clean Material Design 3 interface with full dark mode support.
- 🔄 **Offline-First**: Instant local updates with AsyncStorage and automatic cloud sync to MongoDB.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Mobile App** | React Native, Expo, React Native Paper (MD3), Gifted Charts |
| **Backend API** | Node.js, Express.js, JWT Authentication |
| **Database** | MongoDB Atlas with Mongoose ODM |
| **AI / OCR** | Google Gemini Vision (Receipt OCR) |

---

## 📁 Project Structure

```text
ExpenseTrackerApp/
├── App.js                   # Root component & navigation stack
├── navigation/              # Bottom tab navigation (Home, History, Add, Analytics, Profile)
├── screens/                 # Mobile screens (Dashboard, Analytics, Transactions, etc.)
├── src/
│   ├── api/                 # API clients (Auth, Transactions, Analytics, AI)
│   ├── components/          # Reusable UI components
│   ├── services/            # SMS parser and detection service
│   └── theme/               # Color tokens and MD3 themes
└── backend/
    ├── src/
    │   ├── controllers/     # Route logic (Auth, Transactions, Dashboard, AI)
    │   ├── models/          # MongoDB schemas (User, Transaction, etc.)
    │   ├── routes/          # REST endpoints
    │   └── middleware/      # Auth & error handling
    └── server.js            # Express server entry point
```

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Expo Go](https://expo.dev/go) app on your iOS or Android device

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
AI_API_KEY=your_gemini_api_key
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
From the project root:
```bash
npm install
npm start
```
Scan the QR code with **Expo Go** (Android) or the **Camera app** (iOS) to launch the app.

---

## ⚙️ Environment Variables (Backend)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `5000`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for access tokens |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens |
| `AI_API_KEY` | Google Gemini API key for receipt scanning |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
