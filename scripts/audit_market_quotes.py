#!/usr/bin/env python3
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request


DEFAULT_BAD_TIMING = {"seed", "seed_fallback", "synthetic", "synthetic_error_fallback", "unavailable", "unsupported", None}
DISPLAY_OK_TIMING = {"live", "realtime", "cached_executable", "market_closed", "delayed"}


def get_json(url, timeout):
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return json.load(resp)


def classify(item, market_type, max_age):
    if not item:
        return "failed", "missing_item"
    price = float(item.get("price") or 0)
    timing = item.get("timing_class")
    source = str(item.get("source") or "")
    age = item.get("age_sec")
    executable = bool(item.get("execution_allowed"))

    if timing == "unsupported" or source == "unsupported":
        return "unsupported", item.get("execution_block_reason") or "unsupported_symbol"
    if price <= 0:
        return "failed", "price_unavailable"
    if timing in DEFAULT_BAD_TIMING:
        return "failed", f"bad_timing:{timing}"
    if market_type in {"stocks", "arab"} and timing in {"market_closed", "delayed"}:
        return "market_closed", "display_price"
    if age is not None:
        try:
            if int(age) > max_age:
                return "stale", f"age_sec:{age}"
        except (TypeError, ValueError):
            return "stale", "bad_age"
    if timing in DISPLAY_OK_TIMING or executable:
        return "supported", "ok"
    return "failed", f"unexpected_timing:{timing}"


def main():
    parser = argparse.ArgumentParser(description="Audit MEX market quote readiness without mutating data.")
    parser.add_argument("--base", default="http://127.0.0.1:8000", help="Base URL, for example http://127.0.0.1:8000")
    parser.add_argument("--limit", type=int, default=2000)
    parser.add_argument("--timeout", type=int, default=12)
    parser.add_argument("--max-age", type=int, default=900)
    parser.add_argument("--sleep", type=float, default=0.05)
    parser.add_argument("--out", default="quote_audit_report.json")
    args = parser.parse_args()

    base = args.base.rstrip("/")
    markets_url = f"{base}/api/markets.php?scope=all&supported=1&lite=1&with_quotes=0&no_rescue=1&limit={args.limit}"
    markets = get_json(markets_url, args.timeout)
    items = markets.get("items") or []
    if not items:
        print("No market items returned", file=sys.stderr)
        return 2

    report = {"base": base, "checked_at": int(time.time()), "total": len(items), "summary": {}, "items": []}
    for index, market in enumerate(items, 1):
        symbol = str(market.get("symbol") or "").upper()
        market_type = str(market.get("type") or "crypto").lower()
        if not symbol:
            continue
        url = f"{base}/api/quote_focus.php?symbols={urllib.parse.quote(symbol)}&type={urllib.parse.quote(market_type)}"
        started = time.time()
        try:
            data = get_json(url, args.timeout)
            elapsed_ms = int((time.time() - started) * 1000)
            item = (data.get("items") or [None])[0]
            bucket, reason = classify(item, market_type, args.max_age)
            row = {
                "symbol": symbol,
                "type": market_type,
                "bucket": bucket,
                "reason": reason,
                "elapsed_ms": elapsed_ms,
                "price": item.get("price") if item else None,
                "source": item.get("source") if item else None,
                "timing_class": item.get("timing_class") if item else None,
                "age_sec": item.get("age_sec") if item else None,
                "execution_allowed": bool(item.get("execution_allowed")) if item else False,
            }
        except Exception as exc:
            row = {
                "symbol": symbol,
                "type": market_type,
                "bucket": "failed",
                "reason": str(exc)[:160],
                "elapsed_ms": int((time.time() - started) * 1000),
            }
        report["items"].append(row)
        report["summary"][row["bucket"]] = report["summary"].get(row["bucket"], 0) + 1
        print(f"{index:04d} {symbol:14} {market_type:12} {row['bucket']:14} {row['reason']} {row['elapsed_ms']}ms")
        if args.sleep > 0:
            time.sleep(args.sleep)

    with open(args.out, "w", encoding="utf-8") as fp:
        json.dump(report, fp, indent=2, ensure_ascii=False)
    print("summary", json.dumps(report["summary"], sort_keys=True))
    print("wrote", args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
