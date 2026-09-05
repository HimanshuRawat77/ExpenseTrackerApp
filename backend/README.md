# Expense Tracker — Backend API

Node.js + Express + MongoDB backend for the AI-powered personal finance app.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas + Mongoose
- **Auth**: JWT (access + refresh tokens) + bcrypt
- **AI**: OpenAI / Gemini (Vision + LLM)
- **Validation**: express-validator
- **Security**: Helmet, CORS, rate limiting

## Setup

1. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Health check:
   ```
   GET http://localhost:5000/api/health
   ```

## API Routes

| Prefix | Description |
|---|---|
| `/api/health` | Health check |
| `/api/auth` | Authentication (register, login, refresh, logout) |
| `/api/transactions` | Transaction CRUD with filters |
| `/api/dashboard` | Aggregated financial summaries |
| `/api/budgets` | Budget management |
| `/api/goals` | Savings goals |
| `/api/subscriptions` | Recurring expenses |
| `/api/ai` | AI features (receipt scan, assistant, categorization) |

## Environment Variables

See `.env.example` for required configuration.

**Never commit `.env` to version control.**
