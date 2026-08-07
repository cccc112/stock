import sys
sys.path.insert(0, r"c:/stock/apps/backend")

import asyncio
import httpx
import json
import yfinance as yf

print("=" * 60)
print("TEST 1: TWSE MIS API (2330)")
print("=" * 60)

async def test_twse():
    async with httpx.AsyncClient(timeout=10) as client:
        await client.get("https://mis.twse.com.tw/stock/index.jsp")
        url = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_2330.tw"
        resp = await client.get(url)
        data = resp.json()
        msg = data.get("msgArray", [{}])[0]
        print(f"Name: {msg.get('n')}")
        print(f"Price (z): {msg.get('z')}")
        print(f"PrevClose (y): {msg.get('y')}")
        print(f"Volume (v): {msg.get('v')}")

asyncio.run(test_twse())

print()
print("=" * 60)
print("TEST 2: yfinance NVDA")
print("=" * 60)
try:
    ticker = yf.Ticker("NVDA")
    fi = ticker.fast_info
    print(f"Price: {fi.last_price}")
    print(f"PrevClose: {fi.previous_close}")
    print(f"Volume: {fi.last_volume}")
except Exception as e:
    print(f"ERROR: {e}")

print()
print("=" * 60)
print("TEST 3: yfinance 2330.TW")
print("=" * 60)
try:
    ticker = yf.Ticker("2330.TW")
    fi = ticker.fast_info
    print(f"Price: {fi.last_price}")
    print(f"PrevClose: {fi.previous_close}")
except Exception as e:
    print(f"ERROR: {e}")
