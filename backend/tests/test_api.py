import concurrent.futures
import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app, score_candidate
from backend.seed import CANDIDATES, JOBS


@pytest.fixture
def workspace(tmp_path):
    path = tmp_path / "demo.db"
    with TestClient(create_app(path)) as client:
        yield client, path


def action(client, request="request-001", job="agent", candidate="a01", kind="shortlist"):
    return client.post("/api/actions", json={"job_id": job, "candidate_id": candidate, "action": kind, "request_id": request})


def test_score_is_exact_content_coverage_and_ignores_identity():
    candidate = CANDIDATES[0]
    match = score_candidate(candidate, JOBS[0])
    assert match["score"] == 100
    assert match["parts"] == {"required": 65.0, "preferred": 20.0, "evidence": 15.0}
    renamed = {**candidate, "alias": "Other alias", "age": 99, "nationality": "irrelevant", "gender": "irrelevant"}
    assert score_candidate(renamed, JOBS[0]) == match
    missing = score_candidate({**candidate, "skills": [], "evidence": []}, JOBS[0])
    assert missing["score"] == 0 and missing["missing"] == JOBS[0]["required"]


def test_feed_job_ranking_filters_and_empty(workspace):
    client, _ = workspace
    bootstrap = client.get("/api/bootstrap").json()
    assert len(bootstrap["jobs"]) == 3
    agent = client.get("/api/feed").json()
    assert len(agent["items"]) == 8 and agent["items"][0]["id"] == "a01"
    infra = client.get("/api/feed?job_id=infra").json()
    assert infra["items"][0]["id"] == "a04"
    assert [c["id"] for c in client.get("/api/feed?skill=CUDA").json()["items"]] == ["a04"]
    assert all(any(e["type"] == "demo" for e in c["evidence"]) for c in client.get("/api/feed?evidence_type=demo").json()["items"])
    assert client.get("/api/feed?search=zzzz-no-result").json()["items"] == []
    assert client.get("/api/feed?job_id=does-not-exist").status_code == 404
    assert client.get("/api/feed?evidence_type=unknown").status_code == 422


def test_preferences_and_shortlist_survive_app_restart_and_are_job_scoped(workspace):
    client, path = workspace
    preferences = {"job_id": "infra", "search": "CUDA", "skill": "Python", "evidence_type": "study"}
    assert client.put("/api/preferences", json=preferences).status_code == 200
    assert action(client, job="agent").status_code == 200
    with TestClient(create_app(path)) as restarted:
        assert restarted.get("/api/bootstrap").json()["preferences"] == preferences
        assert [c["id"] for c in restarted.get("/api/feed?job_id=agent&view=shortlist").json()["items"]] == ["a01"]
        assert restarted.get("/api/feed?job_id=infra&view=shortlist").json()["items"] == []
        assert restarted.get("/api/feed").json()["total_candidates"] == 8


def test_parallel_same_request_is_one_action_and_changed_payload_conflicts(workspace):
    client, path = workspace
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(lambda _: action(client), range(6)))
    assert all(r.status_code == 200 for r in results)
    assert len({r.json()["event_id"] for r in results}) == 1
    assert sum(not r.json()["replayed"] for r in results) == 1
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT count(*) FROM actions").fetchone()[0] == 1
    assert action(client, candidate="a02").status_code == 409
    assert action(client, kind="skip").status_code == 409
    assert action(client, job="infra").status_code == 409


def test_skip_undo_restores_previous_shortlist_and_undo_is_idempotent(workspace):
    client, _ = workspace
    action(client)
    skipped = action(client, request="request-002", kind="skip").json()
    feed = client.get("/api/feed").json()
    assert feed["shortlisted"] == 0 and feed["skipped"] == 1
    assert all(c["id"] != "a01" for c in feed["items"])
    for _ in range(2):
        assert client.post(f"/api/actions/{skipped['event_id']}/undo").status_code == 200
    restored = client.get("/api/feed?view=shortlist").json()
    assert [c["id"] for c in restored["items"]] == ["a01"]


def test_stale_undo_cannot_overwrite_newer_action(workspace):
    client, _ = workspace
    first = action(client).json()
    second = action(client, request="request-002", kind="skip").json()
    assert client.post(f"/api/actions/{first['event_id']}/undo").status_code == 409
    assert client.get("/api/feed").json()["skipped"] == 1
    assert client.post(f"/api/actions/{second['event_id']}/undo").status_code == 200
    assert client.post(f"/api/actions/{first['event_id']}/undo").status_code == 200
    assert client.get("/api/feed").json()["shortlisted"] == 0
    assert client.post("/api/actions/999999/undo").status_code == 404


def test_invalid_inputs_do_not_write(workspace):
    client, path = workspace
    assert action(client, candidate="missing").status_code == 404
    assert action(client, job="missing").status_code == 404
    assert action(client, kind="hire").status_code == 422
    assert client.put("/api/preferences", json={"skill":"unlisted-skill"}).status_code == 422
    assert client.put("/api/preferences", json={"job_id":"unknown"}).status_code == 404
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT count(*) FROM actions").fetchone()[0] == 0


def test_api_uses_actual_database_state(workspace):
    client, path = workspace
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO decisions VALUES ('agent','a02','shortlisted')")
    assert [c["id"] for c in client.get("/api/feed?view=shortlist").json()["items"]] == ["a02"]
