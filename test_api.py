import urllib.request, urllib.error, json

try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/market/trending')
    print("SUCCESS!")
    print(req.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f'HTTPError {e.code}: {e.read().decode("utf-8")}')
except Exception as e:
    print(f'Error: {e}')
