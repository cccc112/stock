import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional
import math

class BacktestEngine:
    """
    量化策略回測引擎 (Vectorized + Bar-by-Bar Simulation)
    支援台股與美股的手續費、證交稅、滑價與風控出場機制
    """

    @staticmethod
    def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df['open'] = df['open'].astype(float)
        df['high'] = df['high'].astype(float)
        df['low'] = df['low'].astype(float)
        df['close'] = df['close'].astype(float)
        df['volume'] = df['volume'].astype(float)

        # True Range and ATR
        prev_close = df['close'].shift(1)
        tr1 = df['high'] - df['low']
        tr2 = (df['high'] - prev_close).abs()
        tr3 = (df['low'] - prev_close).abs()
        df['tr'] = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df['atr_14'] = df['tr'].rolling(window=14, min_periods=1).mean()
        df['atr_20'] = df['tr'].rolling(window=20, min_periods=1).mean()

        # Moving Averages
        df['ma5'] = df['close'].rolling(5, min_periods=1).mean()
        df['ma10'] = df['close'].rolling(10, min_periods=1).mean()
        df['ma20'] = df['close'].rolling(20, min_periods=1).mean()
        df['ma60'] = df['close'].rolling(60, min_periods=1).mean()

        # EMA
        df['ema8'] = df['close'].ewm(span=8, adjust=False).mean()
        df['ema21'] = df['close'].ewm(span=21, adjust=False).mean()
        df['ema55'] = df['close'].ewm(span=55, adjust=False).mean()

        # Bollinger Bands
        df['boll_mid'] = df['close'].rolling(20, min_periods=1).mean()
        df['boll_std'] = df['close'].rolling(20, min_periods=1).std().fillna(0)
        df['boll_upper'] = df['boll_mid'] + 2 * df['boll_std']
        df['boll_lower'] = df['boll_mid'] - 2 * df['boll_std']

        # RSI (14)
        delta = df['close'].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(window=14, min_periods=1).mean()
        avg_loss = loss.rolling(window=14, min_periods=1).mean()
        rs = avg_gain / (avg_loss + 1e-9)
        df['rsi_14'] = 100 - (100 / (1 + rs))

        return df

    @classmethod
    def generate_signals(cls, df: pd.DataFrame, strategy_id: str, params: Dict[str, Any]) -> pd.DataFrame:
        df = cls.calculate_indicators(df)
        df['signal'] = 0  # 1: BUY, -1: SELL, 0: HOLD
        df['exit_signal'] = False

        params = params or {}

        if strategy_id == "turtle":
            # 經典海龜交易法則 (Turtle Trading System)
            # GitHub: Dennis/Eckhardt, Backtrader Turtle
            lookback_enter = int(params.get('lookback_enter', 20))
            lookback_exit = int(params.get('lookback_exit', 10))
            
            df['donchian_high'] = df['high'].rolling(lookback_enter, min_periods=1).max().shift(1)
            df['donchian_low'] = df['low'].rolling(lookback_exit, min_periods=1).min().shift(1)

            for i in range(1, len(df)):
                if df['close'].iloc[i] > df['donchian_high'].iloc[i]:
                    df.loc[df.index[i], 'signal'] = 1
                elif df['close'].iloc[i] < df['donchian_low'].iloc[i]:
                    df.loc[df.index[i], 'signal'] = -1

        elif strategy_id == "supertrend":
            # 超級趨勢策略 (SuperTrend)
            # GitHub: Olivier Seban / TradingView SuperTrend
            period = int(params.get('period', 10))
            multiplier = float(params.get('multiplier', 3.0))

            hl2 = (df['high'] + df['low']) / 2
            prev_close = df['close'].shift(1)
            tr = pd.concat([df['high'] - df['low'], (df['high'] - prev_close).abs(), (df['low'] - prev_close).abs()], axis=1).max(axis=1)
            atr = tr.rolling(period, min_periods=1).mean()

            basic_upper = hl2 + multiplier * atr
            basic_lower = hl2 - multiplier * atr

            final_upper = [basic_upper.iloc[0]]
            final_lower = [basic_lower.iloc[0]]
            trend = [1]

            for i in range(1, len(df)):
                c = df['close'].iloc[i]
                c_prev = df['close'].iloc[i - 1]

                # Upper Band
                if basic_upper.iloc[i] < final_upper[-1] or c_prev > final_upper[-1]:
                    fu = basic_upper.iloc[i]
                else:
                    fu = final_upper[-1]
                final_upper.append(fu)

                # Lower Band
                if basic_lower.iloc[i] > final_lower[-1] or c_prev < final_lower[-1]:
                    fl = basic_lower.iloc[i]
                else:
                    fl = final_lower[-1]
                final_lower.append(fl)

                # Trend state
                if trend[-1] == 1:
                    if c < fl:
                        trend.append(-1)
                    else:
                        trend.append(1)
                else:
                    if c > fu:
                        trend.append(1)
                    else:
                        trend.append(-1)

            df['supertrend_signal'] = trend
            df['signal'] = 0
            for i in range(1, len(df)):
                if trend[i] == 1 and trend[i-1] == -1:
                    df.loc[df.index[i], 'signal'] = 1
                elif trend[i] == -1 and trend[i-1] == 1:
                    df.loc[df.index[i], 'signal'] = -1

        elif strategy_id == "dual_thrust":
            # Dual Thrust 區間突破策略 (Michael Chalek)
            # GitHub: vnpy / CTA DualThrust
            lookback = int(params.get('lookback', 5))
            k1 = float(params.get('k1', 0.5))
            k2 = float(params.get('k2', 0.5))

            hh = df['high'].rolling(lookback, min_periods=1).max().shift(1)
            hc = df['close'].rolling(lookback, min_periods=1).max().shift(1)
            lc = df['close'].rolling(lookback, min_periods=1).min().shift(1)
            ll = df['low'].rolling(lookback, min_periods=1).min().shift(1)

            range_val = pd.concat([hh - lc, hc - ll], axis=1).max(axis=1)
            buy_trigger = df['open'] + k1 * range_val
            sell_trigger = df['open'] - k2 * range_val

            for i in range(1, len(df)):
                if df['close'].iloc[i] > buy_trigger.iloc[i]:
                    df.loc[df.index[i], 'signal'] = 1
                elif df['close'].iloc[i] < sell_trigger.iloc[i]:
                    df.loc[df.index[i], 'signal'] = -1

        elif strategy_id == "bollinger_rsi":
            # 布林通道 + RSI 超賣均值回歸 (Bollinger Bands & RSI Mean Reversion)
            # GitHub: Larry Connors / Quantitative Trading Strategies
            rsi_oversold = float(params.get('rsi_oversold', 32))
            rsi_overbought = float(params.get('rsi_overbought', 65))

            for i in range(1, len(df)):
                close = df['close'].iloc[i]
                lower = df['boll_lower'].iloc[i]
                mid = df['boll_mid'].iloc[i]
                rsi = df['rsi_14'].iloc[i]

                # 觸及下軌且 RSI 超賣 -> 買進
                if close <= lower * 1.01 and rsi <= rsi_oversold:
                    df.loc[df.index[i], 'signal'] = 1
                # 碰到中軌 (MA20) 或 RSI 超買 -> 止盈賣出
                elif close >= mid or rsi >= rsi_overbought:
                    df.loc[df.index[i], 'signal'] = -1

        elif strategy_id == "institutional_momentum":
            # 外資投信籌碼跟隨策略 (Taiwan Institutional Smart Money)
            # 結合 20MA 趨勢過濾與外資/投信買賣超
            ma_period = int(params.get('ma_period', 20))
            ma = df['close'].rolling(ma_period, min_periods=1).mean()
            vol_ma = df['volume'].rolling(20, min_periods=1).mean()

            # 若有帶入 institutional_net 欄位則精確比對，若無則以價量異動動能模擬
            has_inst = 'inst_net' in df.columns
            for i in range(1, len(df)):
                close = df['close'].iloc[i]
                vol = df['volume'].iloc[i]
                
                if has_inst:
                    inst_buy = df['inst_net'].iloc[i] > 0 and df['inst_net'].iloc[i-1] > 0
                else:
                    inst_buy = vol > vol_ma.iloc[i] * 1.2 and close > df['open'].iloc[i]

                if close > ma.iloc[i] and inst_buy:
                    df.loc[df.index[i], 'signal'] = 1
                elif close < ma.iloc[i] * 0.98:
                    df.loc[df.index[i], 'signal'] = -1

        elif strategy_id == "ma_cross":
            # 雙均線 / 三均線趨勢順勢策略 (EMA Ribbon Trend Follower)
            fast_p = int(params.get('fast_ma', 8))
            slow_p = int(params.get('slow_ma', 21))
            fast_ma = df['close'].rolling(fast_p, min_periods=1).mean()
            slow_ma = df['close'].rolling(slow_p, min_periods=1).mean()

            for i in range(1, len(df)):
                if fast_ma.iloc[i-1] <= slow_ma.iloc[i-1] and fast_ma.iloc[i] > slow_ma.iloc[i]:
                    df.loc[df.index[i], 'signal'] = 1
                elif fast_ma.iloc[i-1] >= slow_ma.iloc[i-1] and fast_ma.iloc[i] < slow_ma.iloc[i]:
                    df.loc[df.index[i], 'signal'] = -1

        return df

    @classmethod
    def run_backtest(
        cls,
        df: pd.DataFrame,
        strategy_id: str,
        initial_capital: float = 1_000_000.0,
        fee_rate: float = 0.000855,   # 券商手續費 (0.1425% * 0.6)
        tax_rate: float = 0.003,      # 證券交易稅 0.3%
        stop_loss_pct: Optional[float] = None, # 停損百分比 (例如 0.07 代表 7%)
        take_profit_pct: Optional[float] = None, # 停利百分比 (例如 0.15 代表 15%)
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        執行逐根 K 線交易回測
        """
        if df.empty or len(df) < 5:
            raise ValueError("歷史資料不足以進行回測 (至少需 5 根以上)")

        df = df.copy()
        df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')
        df = df.sort_values('date').reset_index(drop=True)

        # 產生訊號
        df = cls.generate_signals(df, strategy_id, params or {})

        cash = float(initial_capital)
        position_shares = 0
        entry_price = 0.0
        entry_date = ""
        trades = []
        equity_curve = []
        benchmark_initial_price = float(df['close'].iloc[0])

        for i in range(len(df)):
            current_date = df['date'].iloc[i]
            current_price = float(df['close'].iloc[i])
            signal = df['signal'].iloc[i]

            # 檢查停損 / 停利
            if position_shares > 0:
                pnl_pct = (current_price - entry_price) / entry_price
                if stop_loss_pct and pnl_pct <= -abs(stop_loss_pct):
                    signal = -1  # 強制停損出場
                elif take_profit_pct and pnl_pct >= abs(take_profit_pct):
                    signal = -1  # 強制停利出場

            # 買進訊號 (空手時進場)
            if signal == 1 and position_shares == 0 and cash > 0:
                # 計算可買股數 (若為台股，以千股/1張為單位或零股)
                # 這裡保留 1% 緩衝手續費
                max_investable = cash * 0.99
                shares_to_buy = int(max_investable // current_price)
                if shares_to_buy > 0:
                    cost = shares_to_buy * current_price
                    fee = cost * fee_rate
                    total_outlay = cost + fee

                    if total_outlay <= cash:
                        cash -= total_outlay
                        position_shares = shares_to_buy
                        entry_price = current_price
                        entry_date = current_date

            # 賣出訊號 (持股時平倉)
            elif signal == -1 and position_shares > 0:
                revenue = position_shares * current_price
                fee = revenue * fee_rate
                tax = revenue * tax_rate
                net_revenue = revenue - fee - tax
                
                trade_pnl = net_revenue - (position_shares * entry_price * (1 + fee_rate))
                trade_return_pct = (trade_pnl / (position_shares * entry_price)) * 100

                entry_dt = datetime.strptime(entry_date, '%Y-%m-%d')
                exit_dt = datetime.strptime(current_date, '%Y-%m-%d')
                holding_days = max(1, (exit_dt - entry_dt).days)

                trades.append({
                    "id": len(trades) + 1,
                    "entry_date": entry_date,
                    "exit_date": current_date,
                    "entry_price": round(entry_price, 2),
                    "exit_price": round(current_price, 2),
                    "shares": position_shares,
                    "pnl": round(trade_pnl, 2),
                    "return_pct": round(trade_return_pct, 2),
                    "hold_days": holding_days,
                    "exit_reason": "訊號平倉" if not (stop_loss_pct and (current_price - entry_price)/entry_price <= -abs(stop_loss_pct)) else "觸發停損"
                })

                cash += net_revenue
                position_shares = 0
                entry_price = 0.0
                entry_date = ""

            # 當日總淨值
            current_portfolio_value = cash + (position_shares * current_price)
            benchmark_equity = (initial_capital / benchmark_initial_price) * current_price

            equity_curve.append({
                "date": current_date,
                "equity": round(current_portfolio_value, 2),
                "benchmark_equity": round(benchmark_equity, 2),
                "return_pct": round(((current_portfolio_value - initial_capital) / initial_capital) * 100, 2),
                "benchmark_return_pct": round(((benchmark_equity - initial_capital) / initial_capital) * 100, 2),
                "drawdown_pct": 0.0
            })

        # 計算回撤 (Drawdown)
        equities = [pt['equity'] for pt in equity_curve]
        peak = equities[0]
        max_drawdown = 0.0

        for idx, pt in enumerate(equity_curve):
            eq = pt['equity']
            if eq > peak:
                peak = eq
            dd = (eq - peak) / peak if peak > 0 else 0
            pt['drawdown_pct'] = round(dd * 100, 2)
            if dd < max_drawdown:
                max_drawdown = dd

        # 績效統計指標
        total_days = len(equity_curve)
        final_equity = equity_curve[-1]['equity'] if equity_curve else initial_capital
        total_return_pct = ((final_equity - initial_capital) / initial_capital) * 100
        benchmark_final = equity_curve[-1]['benchmark_equity'] if equity_curve else initial_capital
        benchmark_return_pct = ((benchmark_final - initial_capital) / initial_capital) * 100

        # CAGR 年化報酬率 (252 交易日/年)
        years = max(total_days / 252.0, 0.01)
        if final_equity > 0:
            cagr = ((final_equity / initial_capital) ** (1.0 / years) - 1.0) * 100
        else:
            cagr = -100.0

        # Sharpe Ratio
        daily_returns = pd.Series(equities).pct_change().dropna()
        if len(daily_returns) > 1 and daily_returns.std() > 1e-6:
            # 假設無風險年化利率 1.5% -> 每日 1.5% / 252
            daily_rf = 0.015 / 252.0
            excess_daily = daily_returns - daily_rf
            sharpe = (excess_daily.mean() / daily_returns.std()) * math.sqrt(252)
        else:
            sharpe = 0.0

        # 勝率與獲利因子
        winning_trades = [t for t in trades if t['pnl'] > 0]
        losing_trades = [t for t in trades if t['pnl'] <= 0]
        win_rate = (len(winning_trades) / len(trades) * 100) if trades else 0.0

        total_profit = sum(t['pnl'] for t in winning_trades)
        total_loss = abs(sum(t['pnl'] for t in losing_trades))
        profit_factor = round(total_profit / (total_loss + 1e-9), 2) if total_loss > 0 else (99.0 if total_profit > 0 else 1.0)

        avg_trade_return = (sum(t['return_pct'] for t in trades) / len(trades)) if trades else 0.0
        avg_hold_days = (sum(t['hold_days'] for t in trades) / len(trades)) if trades else 0.0
        max_win_pct = max([t['return_pct'] for t in trades]) if trades else 0.0
        max_loss_pct = min([t['return_pct'] for t in trades]) if trades else 0.0

        return {
            "summary": {
                "initial_capital": initial_capital,
                "final_equity": round(final_equity, 2),
                "total_return_pct": float(round(total_return_pct, 2)),
                "benchmark_return_pct": float(round(benchmark_return_pct, 2)),
                "alpha_pct": float(round(total_return_pct - benchmark_return_pct, 2)),
                "cagr_pct": float(round(cagr, 2)),
                "max_drawdown_pct": float(round(abs(max_drawdown) * 100, 2)),
                "sharpe_ratio": float(round(sharpe, 2)),
                "win_rate_pct": float(round(win_rate, 2)),
                "profit_factor": float(profit_factor),
                "total_trades": int(len(trades)),
                "winning_trades": int(len(winning_trades)),
                "losing_trades": int(len(losing_trades)),
                "avg_trade_return_pct": float(round(avg_trade_return, 2)),
                "avg_holding_days": float(round(avg_hold_days, 1)),
                "max_win_pct": float(round(max_win_pct, 2)),
                "max_loss_pct": float(round(max_loss_pct, 2)),
            },
            "equity_curve": equity_curve,
            "trades": trades
        }

    @staticmethod
    def get_supported_strategies() -> List[Dict[str, Any]]:
        return [
            {
                "id": "turtle",
                "name": "海龜交易法則 (Turtle Trading)",
                "category": "趨勢突破",
                "github_ref": "Richard Dennis & William Eckhardt / Backtrader Turtle",
                "description": "經典唐奇安通道突破系統。當價格突破 20 日高點時買進進場，跌破 10 日低點時出場，並以 ATR 做動態追蹤與風控。",
                "params": [
                    {"key": "lookback_enter", "label": "進場突破天數", "type": "number", "default": 20, "min": 5, "max": 60},
                    {"key": "lookback_exit", "label": "出場停損天數", "type": "number", "default": 10, "min": 3, "max": 30}
                ]
            },
            {
                "id": "supertrend",
                "name": "超級趨勢策略 (SuperTrend)",
                "category": "動量趨勢",
                "github_ref": "Olivier Seban / TradingView Top Strategy",
                "description": "全球最熱門的 ATR 波動率動態濾網策略。利用真實波幅 (ATR) 隨價格移動，在上漲趨勢中保護獲利，跌破下軌即刻出場反轉。",
                "params": [
                    {"key": "period", "label": "ATR 週期", "type": "number", "default": 10, "min": 5, "max": 30},
                    {"key": "multiplier", "label": "波動率乘數", "type": "number", "default": 3.0, "min": 1.0, "max": 5.0, "step": 0.5}
                ]
            },
            {
                "id": "dual_thrust",
                "name": "Dual Thrust 區間突破策略",
                "category": "CTA突破",
                "github_ref": "Michael Chalek / vn.py CTA Framework",
                "description": "著名的期貨與股票日內/波段突破模型。以歷史最高、最低與收盤價綜合動態計算 Range 波動區間，在突破上界時順勢進場。",
                "params": [
                    {"key": "lookback", "label": "區間回顧天數", "type": "number", "default": 5, "min": 2, "max": 20},
                    {"key": "k1", "label": "多頭突破係數 K1", "type": "number", "default": 0.5, "min": 0.1, "max": 1.5, "step": 0.1},
                    {"key": "k2", "label": "空頭防守係數 K2", "type": "number", "default": 0.5, "min": 0.1, "max": 1.5, "step": 0.1}
                ]
            },
            {
                "id": "bollinger_rsi",
                "name": "布林通道 + RSI 均值回歸策略",
                "category": "逆勢回歸",
                "github_ref": "Larry Connors & John Bollinger / Quantitative Reversion",
                "description": "統計套利與震盪指標經典組合。當股價跌破布林下軌且 RSI 呈現嚴重超賣時進場搶反彈，回到 20MA 或超買時停利。",
                "params": [
                    {"key": "rsi_oversold", "label": "RSI 超賣進場點", "type": "number", "default": 32, "min": 15, "max": 40},
                    {"key": "rsi_overbought", "label": "RSI 超買出場點", "type": "number", "default": 65, "min": 50, "max": 85}
                ]
            },
            {
                "id": "institutional_momentum",
                "name": "外資投信籌碼動量策略",
                "category": "法人籌碼",
                "github_ref": "FinMind Taiwan Stock Quant Research",
                "description": "台股特有量化勝率策略。結合三大法人（外資與投信）連續淨買超動能與 20MA 月線多頭趨勢過濾，跟隨主力資金大口吃肉。",
                "params": [
                    {"key": "ma_period", "label": "趨勢均線週期", "type": "number", "default": 20, "min": 5, "max": 60}
                ]
            },
            {
                "id": "ma_cross",
                "name": "雙均線金叉動量策略 (EMA Ribbon)",
                "category": "均線動態",
                "github_ref": "OpenSource Quant / Moving Average Crossover",
                "description": "經典快慢均線交叉策略。利用短期快線穿破長期慢線確立多頭波段，並於死叉時安全平倉避開大幅回檔。",
                "params": [
                    {"key": "fast_ma", "label": "快線週期", "type": "number", "default": 8, "min": 3, "max": 20},
                    {"key": "slow_ma", "label": "慢線週期", "type": "number", "default": 21, "min": 10, "max": 60}
                ]
            }
        ]
