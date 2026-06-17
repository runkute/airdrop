#!/usr/bin/env python3
"""Check the health of all services."""
import httpx
import sys
import asyncio
import argparse


async def check(base_url: str = "http://localhost:8000"):
    results = []

    # Check backend health
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{base_url}/health", timeout=5)
            data = r.json()
            ok = r.status_code == 200 and data.get("status") == "healthy"
            results.append(("Backend API", ok, data))
    except Exception as e:
        results.append(("Backend API", False, str(e)))

    # Check API docs availability
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{base_url}/docs", timeout=5)
            results.append(("API Docs", r.status_code == 200, "Available"))
    except Exception as e:
        results.append(("API Docs", False, str(e)))

    # Check database via health endpoint
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{base_url}/health", timeout=5)
            data = r.json()
            db_ok = data.get("database") == "connected"
            results.append(("Database", db_ok, data.get("database", "unknown")))
    except Exception as e:
        results.append(("Database", False, str(e)))

    # Check Redis via health endpoint
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{base_url}/health", timeout=5)
            data = r.json()
            redis_ok = data.get("redis") == "connected"
            results.append(("Redis", redis_ok, data.get("redis", "unknown")))
    except Exception as e:
        results.append(("Redis", False, str(e)))

    print("Health Check Results")
    print("=" * 50)
    all_ok = True
    for name, ok, detail in results:
        status = "OK" if ok else "FAIL"
        print(f"[{status}] {name}: {detail}")
        if not ok:
            all_ok = False

    print("=" * 50)
    if all_ok:
        print("All services healthy.")
    else:
        print("Some services are unhealthy. Check logs for details.")
        print("  docker compose logs backend")

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check service health")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Backend base URL (default: http://localhost:8000)",
    )
    args = parser.parse_args()
    asyncio.run(check(args.url))
