from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import yfinance as yf
import anthropic
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

load_dotenv()

app = FastAPI(title="Fiscal AI Clone")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def safe(val, decimals=2):
    try:
        if val is None:
            return None
        f = float(val)
        if f != f:  # nan check
            return None
        return round(f, decimals)
    except Exception:
        return None


@app.get("/api/stock/{ticker}")
async def get_stock(ticker: str):
    try:
        stock = yf.Ticker(ticker.upper())
        fi = stock.fast_info

        price = safe(fi.last_price)
        prev = safe(fi.previous_close)
        change = safe(price - prev) if price and prev else None
        change_pct = safe((change / prev) * 100) if change and prev else None

        # Try to get extra info (may fail with rate limit — gracefully degrade)
        info = {}
        try:
            info = stock.info or {}
        except Exception:
            pass

        return {
            "symbol": ticker.upper(),
            "name": info.get("longName") or info.get("shortName") or ticker.upper(),
            "price": price,
            "change": change,
            "changePercent": change_pct,
            "marketCap": safe(fi.market_cap, 0),
            "peRatio": safe(info.get("trailingPE")),
            "forwardPE": safe(info.get("forwardPE")),
            "eps": safe(info.get("trailingEps")),
            "revenue": safe(info.get("totalRevenue"), 0),
            "volume": safe(fi.three_month_average_volume, 0),
            "avgVolume": safe(fi.three_month_average_volume, 0),
            "high52": safe(fi.year_high),
            "low52": safe(fi.year_low),
            "dividendYield": safe(info.get("dividendYield")),
            "beta": safe(info.get("beta")),
            "description": info.get("longBusinessSummary"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "website": info.get("website"),
            "employees": info.get("fullTimeEmployees"),
            "country": info.get("country"),
            "currency": info.get("currency") or getattr(fi, "currency", "USD"),
            "exchange": info.get("exchange") or getattr(fi, "exchange", None),
            "priceToBook": safe(info.get("priceToBook")),
            "debtToEquity": safe(info.get("debtToEquity")),
            "returnOnEquity": safe(info.get("returnOnEquity")),
            "profitMargins": safe(info.get("profitMargins")),
            "grossMargins": safe(info.get("grossMargins")),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Stock not found: {str(e)}")


@app.get("/api/stock/{ticker}/chart")
async def get_chart(ticker: str, period: str = "1y", interval: str = "1d"):
    try:
        stock = yf.Ticker(ticker.upper())
        hist = stock.history(period=period, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail="No chart data found")

        data = []
        for date, row in hist.iterrows():
            data.append({
                "time": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        return {"ticker": ticker.upper(), "data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stock/{ticker}/financials")
async def get_financials(ticker: str):
    try:
        stock = yf.Ticker(ticker.upper())

        # Annual statements
        income   = stock.income_stmt
        balance  = stock.balance_sheet
        cashflow = stock.cashflow

        # Quarterly statements
        q_income   = stock.quarterly_income_stmt
        q_balance  = stock.quarterly_balance_sheet
        q_cashflow = stock.quarterly_cashflow

        def quarter_label(ts):
            m = ts.month
            q = (m - 1) // 3 + 1
            return f"Q{q} {ts.year}"

        def format_df(df):
            if df is None or df.empty:
                return {}
            result = {}
            for col in df.columns[:5]:
                label = col.strftime("%Y")
                result[label] = {}
                for idx in df.index:
                    try:
                        val = float(df.loc[idx, col])
                        if val == val:
                            result[label][str(idx)] = val
                    except Exception:
                        pass
            return result

        def build_series(df, keys, quarterly=False):
            if df is None or df.empty:
                return []
            n = 8 if quarterly else 5
            rows = []
            for col in reversed(df.columns[:n]):
                label = quarter_label(col) if quarterly else col.strftime("%Y")
                entry = {"year": label}
                for key in keys:
                    if key in df.index:
                        try:
                            val = float(df.loc[key, col])
                            entry[key] = val if val == val else None
                        except Exception:
                            entry[key] = None
                    else:
                        entry[key] = None
                rows.append(entry)
            return rows

        INCOME_KEYS   = ["Total Revenue", "Gross Profit", "Operating Income", "Net Income", "EBITDA", "Basic EPS"]
        CASHFLOW_KEYS = ["Free Cash Flow", "Operating Cash Flow", "Capital Expenditure"]
        BALANCE_KEYS  = ["Total Assets", "Total Liabilities Net Minority Interest", "Stockholders Equity", "Total Debt", "Cash And Cash Equivalents"]

        return {
            "income":   format_df(income),
            "balance":  format_df(balance),
            "cashflow": format_df(cashflow),
            "series": {
                "annual": {
                    "income":   build_series(income,   INCOME_KEYS),
                    "cashflow": build_series(cashflow, CASHFLOW_KEYS),
                    "balance":  build_series(balance,  BALANCE_KEYS),
                },
                "quarterly": {
                    "income":   build_series(q_income,   INCOME_KEYS,   quarterly=True),
                    "cashflow": build_series(q_cashflow, CASHFLOW_KEYS, quarterly=True),
                    "balance":  build_series(q_balance,  BALANCE_KEYS,  quarterly=True),
                },
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search")
async def search_stocks(q: str):
    tickers = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX",
        "AMD", "INTC", "JPM", "BAC", "GS", "WMT", "COST", "V", "MA",
        "JNJ", "PFE", "UNH", "XOM", "CVX", "DIS", "CRM", "ORCL", "PYPL",
        "UBER", "SPOT", "SNAP", "PLTR", "SOFI", "RBLX", "COIN",
    ]
    q_upper = q.upper()
    matches = [t for t in tickers if q_upper in t][:8]
    return {"results": matches}


class ChatMessage(BaseModel):
    message: str
    ticker: Optional[str] = None
    stock_context: Optional[dict] = None


@app.post("/api/chat")
async def chat(body: ChatMessage):
    system_prompt = (
        "You are an expert financial analyst AI assistant, like a Bloomberg terminal AI. "
        "You help investors analyze stocks, understand financial metrics, interpret market trends, "
        "and make informed investment decisions. Be concise, precise, and data-driven. "
        "Use bullet points and sections for clarity. If no stock is provided, answer general finance questions."
    )

    context = ""
    if body.ticker and body.stock_context:
        ctx = body.stock_context
        context = f"\n\nUser is currently viewing: {body.ticker} ({ctx.get('name', '')})\n"
        if ctx.get("price"):
            context += f"- Price: ${ctx['price']}\n"
        if ctx.get("changePercent") is not None:
            context += f"- Change: {ctx['changePercent']:+.2f}%\n"
        if ctx.get("marketCap"):
            mc = ctx["marketCap"]
            context += f"- Market Cap: ${mc/1e9:.2f}B\n"
        if ctx.get("peRatio"):
            context += f"- P/E Ratio: {ctx['peRatio']:.2f}\n"
        if ctx.get("sector"):
            context += f"- Sector: {ctx['sector']}\n"

    def generate():
        try:
            with client.messages.stream(
                model="claude-opus-4-6",
                max_tokens=1024,
                system=system_prompt + context,
                messages=[{"role": "user", "content": body.message}],
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("RAILWAY_ENVIRONMENT") is None  # no reload in production
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
