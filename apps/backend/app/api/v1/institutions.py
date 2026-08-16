from fastapi import APIRouter
from app.services.finmind import finmind_service
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/tw")
async def get_tw_institutions():
    """Get total market institutional net buy/sell for Taiwan for the last 30 days."""
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    data = await finmind_service._fetch_data("TaiwanStockTotalInstitutionalInvestors", "", start_date)
    
    # data is a list of dicts. We want to group by date.
    # {"date": "2024-02-01", "name": "外資及陸資(不含外資自營商)", "buy": 1000, "sell": 500}
    # Calculate net_buy = buy - sell for Foreign (外資), Investment Trust (投信), Dealer (自營商)
    
    daily_data = {}
    for row in data:
        date = row.get("date")
        name = row.get("name", "")
        net = row.get("buy", 0) - row.get("sell", 0)
        
        if date not in daily_data:
            daily_data[date] = {"date": date, "foreign": 0, "trust": 0, "dealer": 0}
            
        # TWD is too large, convert to billions (億)
        net_billion = net / 100000000
        
        if "外資" in name:
            daily_data[date]["foreign"] += net_billion
        elif "投信" in name:
            daily_data[date]["trust"] += net_billion
        elif "自營商" in name:
            daily_data[date]["dealer"] += net_billion
            
    # return sorted list
    result = list(daily_data.values())
    result.sort(key=lambda x: x["date"])
    return result

@router.get("/us/13f")
async def get_us_13f():
    return [
        {
            "fund_name": "Berkshire Hathaway",
            "manager": "Warren Buffett",
            "report_date": "2023-11-15",
            "portfolio_value": "$313.3B",
            "top_buys": [
                {"symbol": "AAPL", "name": "Apple", "shares_added": "10.0M"},
                {"symbol": "OXY", "name": "Occidental Petroleum", "shares_added": "4.5M"}
            ],
            "top_sells": [
                {"symbol": "CVX", "name": "Chevron", "shares_added": "-12.9M"},
                {"symbol": "ATVI", "name": "Activision Blizzard", "shares_added": "-14.7M"}
            ]
        },
        {
            "fund_name": "Bridgewater Associates",
            "manager": "Ray Dalio",
            "report_date": "2023-11-15",
            "portfolio_value": "$16.5B",
            "top_buys": [
                {"symbol": "IVV", "name": "iShares Core S&P 500 ETF", "shares_added": "2.1M"},
                {"symbol": "META", "name": "Meta Platforms", "shares_added": "0.5M"}
            ],
            "top_sells": [
                {"symbol": "PG", "name": "Procter & Gamble", "shares_added": "-1.2M"},
                {"symbol": "PEP", "name": "PepsiCo", "shares_added": "-0.9M"}
            ]
        },
        {
            "fund_name": "Scion Asset Management",
            "manager": "Michael Burry",
            "report_date": "2023-11-15",
            "portfolio_value": "$44.0M",
            "top_buys": [
                {"symbol": "BABA", "name": "Alibaba Group", "shares_added": "50K"},
                {"symbol": "JD", "name": "JD.com", "shares_added": "125K"}
            ],
            "top_sells": [
                {"symbol": "SPY", "name": "SPDR S&P 500 ETF (Puts)", "shares_added": "-20K"},
                {"symbol": "QQQ", "name": "Invesco QQQ Trust (Puts)", "shares_added": "-20K"}
            ]
        },
        {
            "fund_name": "Renaissance Technologies",
            "manager": "Peter Brown",
            "report_date": "2023-11-15",
            "portfolio_value": "$60.2B",
            "top_buys": [
                {"symbol": "NVO", "name": "Novo Nordisk", "shares_added": "1.2M"},
                {"symbol": "VRTX", "name": "Vertex Pharmaceuticals", "shares_added": "0.8M"}
            ],
            "top_sells": [
                {"symbol": "GILD", "name": "Gilead Sciences", "shares_added": "-2.5M"},
                {"symbol": "AMZN", "name": "Amazon.com", "shares_added": "-3.1M"}
            ]
        }
    ]
