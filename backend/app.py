"""Local, single-workspace demo. No LLM, external services, or automated hiring."""
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from backend.seed import CANDIDATES, JOBS


class Preferences(BaseModel):
    job_id: str = "agent"
    search: str = Field(default="", max_length=80)
    skill: str = Field(default="", max_length=40)
    evidence_type: Literal["", "code", "demo", "study"] = ""


class Action(BaseModel):
    job_id: str
    candidate_id: str
    action: Literal["shortlist", "remove", "skip"]
    request_id: str = Field(min_length=8, max_length=100)


def score_candidate(candidate, job):
    """Transparent content coverage, never a prediction of job performance."""
    skills = set(candidate["skills"])
    required = [skill for skill in job["required"] if skill in skills]
    preferred = [skill for skill in job["preferred"] if skill in skills]
    types = {item["type"] for item in candidate["evidence"]}
    evidence_matches = [kind for kind in job["evidence_types"] if kind in types]
    parts = {"required": round(65 * len(required) / len(job["required"]), 1),
             "preferred": round(20 * len(preferred) / len(job["preferred"]), 1),
             "evidence": round(15 * len(evidence_matches) / len(job["evidence_types"]), 1)}
    missing = [skill for skill in job["required"] if skill not in skills]
    return {"score": round(sum(parts.values())), "parts": parts, "required_matches": required,
            "preferred_matches": preferred, "missing": missing, "evidence_matches": evidence_matches,
            "summary": f"材料覆盖 {len(required)}/{len(job['required'])} 项岗位核心技能，包含 {len(candidate['evidence'])} 份工作样例。",
            "note": "仅衡量已提供材料的内容相关性；未展示不等于不会，最终由 HR 判断。"}


def create_app(database_path=None):
    path = Path(database_path or os.environ.get("TALENT_REELS_DB", Path(__file__).resolve().parent.parent / "data" / "talent-reels.db"))
    path.parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connection(write=False):
        db = sqlite3.connect(path, timeout=15)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            if write:
                db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    with connection() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript("""
        CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS candidates(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS preferences(id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS decisions(job_id TEXT REFERENCES jobs(id), candidate_id TEXT REFERENCES candidates(id), state TEXT NOT NULL CHECK(state IN ('active','shortlisted','skipped')), PRIMARY KEY(job_id,candidate_id));
        CREATE TABLE IF NOT EXISTS actions(id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT UNIQUE NOT NULL, job_id TEXT REFERENCES jobs(id), candidate_id TEXT REFERENCES candidates(id), action TEXT NOT NULL, previous_state TEXT NOT NULL, next_state TEXT NOT NULL, undone INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        """)
        db.executemany("INSERT OR IGNORE INTO jobs VALUES (?,?)", [(j["id"], json.dumps(j, ensure_ascii=False)) for j in JOBS])
        db.executemany("INSERT OR IGNORE INTO candidates VALUES (?,?)", [(c["id"], json.dumps(c, ensure_ascii=False)) for c in CANDIDATES])
        db.execute("INSERT OR IGNORE INTO preferences VALUES (1,?)", (Preferences().model_dump_json(),))

    app = FastAPI(title="Talent Reels", version="1.0.0", description="Fictional, local HR discovery demo. Deterministic content ranking, no automated hiring.")
    app.state.database_path = path

    def get_job(db, job_id):
        row = db.execute("SELECT payload FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not row:
            raise HTTPException(404, "职位不存在，请重新选择。")
        return json.loads(row[0])

    def all_candidates(db):
        return [json.loads(row[0]) for row in db.execute("SELECT payload FROM candidates ORDER BY id")]

    @app.get("/api/health")
    def health():
        return {"status": "ok", "storage": "sqlite", "mode": "fictional-demo", "ranking": "deterministic-content-coverage-v1"}

    @app.get("/api/bootstrap")
    def bootstrap():
        with connection() as db:
            return {"jobs": [json.loads(r[0]) for r in db.execute("SELECT payload FROM jobs ORDER BY rowid")],
                    "preferences": json.loads(db.execute("SELECT payload FROM preferences WHERE id=1").fetchone()[0]),
                    "skills": sorted({s for c in all_candidates(db) for s in c["skills"]}),
                    "disclosure": "所有候选人、公司和作品均为虚构示例。这是根据项目思路重新实现的演示，不是原获奖源码。"}

    @app.put("/api/preferences")
    def save_preferences(preferences: Preferences):
        with connection(write=True) as db:
            get_job(db, preferences.job_id)
            if preferences.skill and preferences.skill not in {s for c in all_candidates(db) for s in c["skills"]}:
                raise HTTPException(422, "未知技能筛选项。")
            db.execute("UPDATE preferences SET payload=? WHERE id=1", (preferences.model_dump_json(),))
        return preferences

    @app.get("/api/feed")
    def feed(job_id: str = "agent", search: str = Query(default="", max_length=80), skill: str = "", evidence_type: Literal["", "code", "demo", "study"] = "", view: Literal["discover", "shortlist"] = "discover"):
        with connection() as db:
            job = get_job(db, job_id)
            states = {r["candidate_id"]: r["state"] for r in db.execute("SELECT * FROM decisions WHERE job_id=?", (job_id,))}
            candidates = all_candidates(db)
            items = []
            for candidate in candidates:
                state = states.get(candidate["id"], "active")
                if state == "skipped" or (view == "shortlist" and state != "shortlisted"):
                    continue
                if skill and skill not in candidate["skills"]:
                    continue
                if evidence_type and evidence_type not in {e["type"] for e in candidate["evidence"]}:
                    continue
                searchable = " ".join([candidate["alias"], candidate["headline"], candidate["summary"], candidate["project"], *candidate["skills"], *[e["title"] + " " + e["summary"] for e in candidate["evidence"]]])
                if search.strip().casefold() not in searchable.casefold():
                    continue
                items.append({**candidate, "state": state, "match": score_candidate(candidate, job)})
            items.sort(key=lambda item: (-item["match"]["score"], item["id"]))
            last = db.execute("SELECT id FROM actions WHERE job_id=? AND undone=0 ORDER BY id DESC LIMIT 1", (job_id,)).fetchone()
            return {"items": items, "total": len(items), "total_candidates": len(candidates),
                    "shortlisted": sum(s == "shortlisted" for s in states.values()), "skipped": sum(s == "skipped" for s in states.values()),
                    "undo_event_id": last[0] if last else None, "job": job}

    @app.post("/api/actions")
    def act(payload: Action):
        with connection(write=True) as db:
            get_job(db, payload.job_id)
            if not db.execute("SELECT 1 FROM candidates WHERE id=?", (payload.candidate_id,)).fetchone():
                raise HTTPException(404, "候选人不存在。")
            existing = db.execute("SELECT * FROM actions WHERE request_id=?", (payload.request_id,)).fetchone()
            if existing:
                if (existing["job_id"], existing["candidate_id"], existing["action"]) != (payload.job_id, payload.candidate_id, payload.action):
                    raise HTTPException(409, "这个请求编号已经用于另一项操作。")
                return {"event_id": existing["id"], "replayed": True, "undone": bool(existing["undone"])}
            previous = db.execute("SELECT state FROM decisions WHERE job_id=? AND candidate_id=?", (payload.job_id, payload.candidate_id)).fetchone()
            previous_state = previous[0] if previous else "active"
            next_state = {"shortlist": "shortlisted", "remove": "active", "skip": "skipped"}[payload.action]
            event = db.execute("INSERT INTO actions(request_id,job_id,candidate_id,action,previous_state,next_state) VALUES (?,?,?,?,?,?)", (payload.request_id, payload.job_id, payload.candidate_id, payload.action, previous_state, next_state))
            db.execute("INSERT INTO decisions VALUES (?,?,?) ON CONFLICT(job_id,candidate_id) DO UPDATE SET state=excluded.state", (payload.job_id, payload.candidate_id, next_state))
            return {"event_id": event.lastrowid, "state": next_state, "replayed": False}

    @app.post("/api/actions/{event_id}/undo")
    def undo(event_id: int):
        with connection(write=True) as db:
            event = db.execute("SELECT * FROM actions WHERE id=?", (event_id,)).fetchone()
            if not event:
                raise HTTPException(404, "找不到可撤销的操作。")
            if event["undone"]:
                return {"undone": True, "event_id": event_id, "replayed": True}
            latest = db.execute("SELECT id FROM actions WHERE job_id=? AND candidate_id=? AND undone=0 ORDER BY id DESC LIMIT 1", (event["job_id"], event["candidate_id"])).fetchone()
            if latest[0] != event_id:
                raise HTTPException(409, "这位候选人已有更新的操作，请先撤销最新操作。")
            db.execute("UPDATE decisions SET state=? WHERE job_id=? AND candidate_id=?", (event["previous_state"], event["job_id"], event["candidate_id"]))
            db.execute("UPDATE actions SET undone=1 WHERE id=?", (event_id,))
            return {"undone": True, "event_id": event_id, "state": event["previous_state"]}

    return app


app = create_app()
