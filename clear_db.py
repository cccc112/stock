import sys
import asyncio
sys.path.append('apps/backend')
from dotenv import load_dotenv
load_dotenv('apps/backend/.env')
from app.core.deps import get_supabase

db = get_supabase()
db.table('portfolio_transactions').delete().neq('symbol', '0000').execute()
print('Cleared!')
