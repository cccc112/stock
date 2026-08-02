from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.scheduler.tasks import scan_alerts, scan_volume_anomalies, update_market_summary

scheduler = AsyncIOScheduler()

def setup_jobs():
    scheduler.add_job(scan_alerts, 'interval', minutes=1, id='scan_alerts', replace_existing=True)
    scheduler.add_job(scan_volume_anomalies, 'interval', minutes=15, id='scan_anomalies', replace_existing=True)
    scheduler.add_job(update_market_summary, 'interval', hours=1, id='update_market_summary', replace_existing=True)

def start_scheduler():
    setup_jobs()
    scheduler.start()
    
def stop_scheduler():
    scheduler.shutdown()
