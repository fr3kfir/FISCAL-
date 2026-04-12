# Fiscal AI Clone — Setup Guide

## 1. Add your API Key

Copy the example env file and add your key:
```
cd backend
copy .env.example .env
```
Then open `backend/.env` and replace `your_api_key_here` with your real Anthropic API key.

---

## 2. Start the Backend

Open a terminal in the `backend/` folder:
```
cd C:\Users\KfirY\fiscal-clone\backend
pip install -r requirements.txt
python main.py
```
Backend runs at: http://localhost:8000

---

## 3. Start the Frontend

Open a SECOND terminal in the `frontend/` folder:
```
cd C:\Users\KfirY\fiscal-clone\frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:5173

---

## 4. Open the App

Go to: http://localhost:5173

---

## Features
- Search any US stock ticker
- Real-time price, change, stats
- Candlestick chart (1W / 1M / 3M / 6M / 1Y / 5Y)
- Income Statement & Balance Sheet
- AI Copilot powered by Claude (streaming responses)
- Quick watchlist in sidebar
