#!/usr/bin/env python3
"""Update ONE teammate's entry in status.json (and bump "updated" to now, HKT).

Usage:
  ./update_status.py scarlett --activity typing --status "寫緊歌手 DM 跟進"
  ./update_status.py luke --activity pantry --status "休息一陣"
  ./update_status.py jennifer --alert "等 Lobaton 決定"        # only change alert (status/activity kept)
  ./update_status.py jennifer --clear-alert
  ./update_status.py --touch                                    # only refresh the "updated" timestamp (heartbeat)

activity: typing | idle | pantry | thinking   (break = pantry)
Writes atomically (temp file + rename) so the page never reads a half-written file.
Keep texts GENERIC (no singer names / IG handles / internal disputes) - the page may be public.
"""
import argparse, json, os, sys, tempfile
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
HKT = timezone(timedelta(hours=8))
IDS = {"scarlett": ("Scarlett", "A&R"), "tatum": ("Tatum", "Marketing"), "luke": ("Luke", "Originals"),
       "jaylen": ("Jaylen", "Music Production"), "jennifer": ("Jennifer", "Operations")}
ACTS = {"typing", "idle", "pantry", "thinking", "break"}

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("id", nargs="?", help="scarlett|tatum|luke|jaylen|jennifer")
    ap.add_argument("--activity", "-a", choices=sorted(ACTS))
    ap.add_argument("--status", "-s")
    ap.add_argument("--alert", help="non-empty => bubble turns red (e.g. 等 Lobaton 決定)")
    ap.add_argument("--clear-alert", action="store_true")
    ap.add_argument("--touch", action="store_true", help="only bump the updated timestamp")
    ap.add_argument("--file", "-f", default=os.path.join(HERE, "status.json"))
    a = ap.parse_args()
    if not a.touch and not a.id:
        ap.error("need an id (or --touch)")
    if a.id and a.id.lower() not in IDS:
        ap.error("unknown id %r; use one of %s" % (a.id, ", ".join(IDS)))
    try:
        data = json.load(open(a.file, encoding="utf-8"))
    except FileNotFoundError:
        data = {"updated": "", "agents": [{"id": k, "name": v[0], "role": v[1], "activity": "idle", "status": "", "alert": ""} for k, v in IDS.items()]}
    agents = {x.get("id"): x for x in data.get("agents", [])}
    if a.id:
        i = a.id.lower()
        e = agents.get(i)
        if e is None:
            e = {"id": i, "name": IDS[i][0], "role": IDS[i][1], "activity": "idle", "status": "", "alert": ""}
            data.setdefault("agents", []).append(e)
        if a.activity: e["activity"] = "pantry" if a.activity == "break" else a.activity
        if a.status is not None: e["status"] = a.status
        if a.alert is not None: e["alert"] = a.alert
        if a.clear_alert: e["alert"] = ""
        e.pop("demo", None)  # a real update replaces any demo value
    data["updated"] = datetime.now(HKT).replace(microsecond=0).isoformat()
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(os.path.abspath(a.file)), suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")
    os.chmod(tmp, 0o644)
    os.replace(tmp, a.file)
    print("updated", data["updated"], (a.id or "(heartbeat)"))

if __name__ == "__main__":
    main()
