import requests
import time

for i in range(10):
    try:
        resp = requests.get("http://127.0.0.1:8000/health")
        print(f"Health check status: {resp.status_code}")
        print(resp.json())
        break
    except Exception as e:
        print(f"Waiting for server... ({i+1}/10)")
        time.sleep(2)
else:
    print("Server failed to start in time.")
