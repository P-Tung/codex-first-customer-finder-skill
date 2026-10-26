#!/usr/bin/env python3
"""Local dashboard server for Vietnam Lead Finder. Binds only to loopback."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sqlite3
import sys
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
sys.path.insert(0, str(REPO / "first-customer-finder" / "scripts"))
from prospect_data import normalize_report  # noqa: E402

APP_DIR = Path.home() / "Library" / "Application Support" / "VietnamLeadFinder"
APP_DIR = Path(os.environ.get("VIETNAM_LEAD_FINDER_HOME", str(APP_DIR))).expanduser()
DB_PATH = APP_DIR / "leads.sqlite3"
DIST_DIR = ROOT / "web" / "dist"
STATUSES = {"new", "contacted", "ignore"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db() -> sqlite3.Connection:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    os.chmod(APP_DIR, 0o700)
    if DB_PATH.is_symlink():
        raise ValueError("Local database path cannot be a symlink")
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        company_url TEXT,
        industry TEXT,
        location TEXT,
        score INTEGER NOT NULL DEFAULT 0,
        stage TEXT,
        pain_signal TEXT,
        evidence TEXT,
        source_type TEXT,
        source_title TEXT,
        source_url TEXT,
        signal_date TEXT,
        checked_at TEXT,
        target_role TEXT,
        contact_url TEXT,
        contact_label TEXT,
        why_fit TEXT,
        why_now TEXT,
        dimensions_json TEXT,
        next_step TEXT,
        caution TEXT,
        status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','ignore')),
        note TEXT NOT NULL DEFAULT '',
        project_key TEXT,
        imported_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )""")
    existing_columns = {row["name"] for row in conn.execute("PRAGMA table_info(leads)")}
    for name, sql_type in (
        ("source_type", "TEXT"), ("signal_date", "TEXT"),
        ("checked_at", "TEXT"), ("dimensions_json", "TEXT"),
    ):
        if name not in existing_columns:
            conn.execute(f"ALTER TABLE leads ADD COLUMN {name} {sql_type}")
    return conn


def lead_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def export_rows(query: str) -> list[dict]:
    from urllib.parse import parse_qs
    params = parse_qs(query)
    status = params.get("status", ["all"])[0]
    search = params.get("q", [""])[0].strip()
    clauses, values = [], []
    if status in STATUSES:
        clauses.append("status=?")
        values.append(status)
    if search:
        clauses.append("(company LIKE ? OR industry LIKE ? OR location LIKE ? OR pain_signal LIKE ?)")
        values.extend([f"%{search}%"] * 4)
    sql = "SELECT * FROM leads" + (" WHERE " + " AND ".join(clauses) if clauses else "") + " ORDER BY score DESC, imported_at DESC"
    conn = db()
    rows = [lead_dict(row) for row in conn.execute(sql, values).fetchall()]
    conn.close()
    return rows


def xlsx_bytes(rows: list[dict]) -> bytes:
    """Create a dependency-free XLSX workbook with one Leads worksheet."""
    columns = [
        ("company", "Doanh nghiệp"), ("company_url", "Website doanh nghiệp"),
        ("industry", "Ngành"), ("location", "Khu vực"),
        ("score", "Điểm phù hợp"), ("stage", "Tín hiệu"), ("status", "Trạng thái"),
        ("target_role", "Vai trò mục tiêu"), ("pain_signal", "Nhu cầu / tín hiệu"),
        ("evidence", "Bằng chứng"), ("why_fit", "Lý do phù hợp"), ("why_now", "Lý do thời điểm"),
        ("source_title", "Nguồn"), ("source_url", "Link nguồn"),
        ("signal_date", "Ngày có tín hiệu"), ("checked_at", "Ngày kiểm tra"),
        ("contact_url", "Kênh liên hệ công khai"), ("next_step", "Bước tiếp theo"),
        ("caution", "Lưu ý"), ("note", "Ghi chú"),
    ]

    def col_name(n: int) -> str:
        result = ""
        while n:
            n, rem = divmod(n - 1, 26)
            result = chr(65 + rem) + result
        return result

    def cell(ref: str, value) -> str:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return f'<c r="{ref}"><v>{value}</v></c>'
        safe = str(value if value is not None else "")
        safe = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", safe)
        safe = safe.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        safe = safe.replace('"', "&quot;").replace("'", "&apos;")
        return f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{safe}</t></is></c>'

    matrix = [[label for _, label in columns]] + [[r.get(key, "") for key, _ in columns] for r in rows]
    sheet_rows = []
    for ri, values in enumerate(matrix, 1):
        cells = "".join(cell(f"{col_name(ci)}{ri}", value) for ci, value in enumerate(values, 1))
        sheet_rows.append(f'<row r="{ri}">{cells}</row>')
    sheet = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
             '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
             'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
             f'<sheetData>{"".join(sheet_rows)}</sheetData></worksheet>')
    files = {
        "[Content_Types].xml": ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '</Types>'),
        "_rels/.rels": ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>'),
        "xl/workbook.xml": ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Leads" sheetId="1" r:id="rId1"/></sheets></workbook>'),
        "xl/_rels/workbook.xml.rels": ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '</Relationships>'),
        "xl/worksheets/sheet1.xml": sheet,
    }
    from io import BytesIO
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return output.getvalue()


class Handler(BaseHTTPRequestHandler):
    server_version = "VietnamLeadFinder/0.1"

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def _json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        if self.headers.get("Host", "").split(":")[0] not in {"127.0.0.1", "localhost"}:
            raise ValueError("Chỉ chấp nhận kết nối từ localhost")
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 6_000_000:
            raise ValueError("Dữ liệu gửi lên không hợp lệ hoặc vượt quá 6 MB")
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc != self.headers.get("Host"):
            raise ValueError("Yêu cầu từ nguồn không hợp lệ")
        return json.loads(self.rfile.read(length))

    def do_GET(self):
        if self.headers.get("Host", "").split(":")[0] not in {"127.0.0.1", "localhost"}:
            return self._json({"error": "Chỉ chấp nhận kết nối từ localhost"}, 403)
        path = urlparse(self.path).path
        if path == "/api/health":
            return self._json({"ok": True, "storage": str(DB_PATH), "research": "AI skill import"})
        if path == "/api/leads":
            query = urlparse(self.path).query
            from urllib.parse import parse_qs
            params = parse_qs(query)
            status = params.get("status", ["all"])[0]
            search = params.get("q", [""])[0].strip()
            conn = db()
            clauses, values = [], []
            if status in STATUSES:
                clauses.append("status=?")
                values.append(status)
            if search:
                clauses.append("(company LIKE ? OR industry LIKE ? OR location LIKE ? OR pain_signal LIKE ?)")
                values.extend([f"%{search}%"] * 4)
            sql = "SELECT * FROM leads" + (" WHERE " + " AND ".join(clauses) if clauses else "") + " ORDER BY score DESC, imported_at DESC"
            leads = [lead_dict(row) for row in conn.execute(sql, values).fetchall()]
            counts = {s: conn.execute("SELECT COUNT(*) FROM leads WHERE status=?", (s,)).fetchone()[0] for s in STATUSES}
            total = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
            average = round(conn.execute("SELECT COALESCE(AVG(score), 0) FROM leads").fetchone()[0])
            conn.close()
            return self._json({"leads": leads, "counts": {"all": total, "average": average, **counts}})
        if path == "/api/export.xlsx":
            rows = export_rows(urlparse(self.path).query)
            raw = xlsx_bytes(rows)
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            self.send_header("Content-Disposition", 'attachment; filename="vietnam-leads.xlsx"')
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        if path == "/api/export.csv":
            import csv
            from io import StringIO
            rows = export_rows(urlparse(self.path).query)
            output = StringIO(newline="")
            fields = ["company", "company_url", "industry", "location", "score", "stage", "status", "target_role", "pain_signal", "evidence", "why_fit", "why_now", "source_title", "source_url", "signal_date", "checked_at", "contact_url", "next_step", "caution", "note"]
            writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                safe = {k: row.get(k, "") for k in fields}
                for key, value in safe.items():
                    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")):
                        safe[key] = "'" + value
                writer.writerow(safe)
            raw = output.getvalue().encode("utf-8-sig")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="vietnam-leads.csv"')
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        if path.startswith("/api/"):
            return self._json({"error": "Không tìm thấy API"}, 404)
        if path == "/":
            path = "/index.html"
        candidate = (DIST_DIR / path.lstrip("/")).resolve()
        if not candidate.is_relative_to(DIST_DIR.resolve()) or not candidate.is_file():
            return self._json({"error": "Chưa build giao diện. Chạy ./lead-finder setup"}, 404)
        raw = candidate.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(candidate.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if urlparse(self.path).path != "/api/import":
            return self._json({"error": "Không tìm thấy API"}, 404)
        try:
            body = self._body()
            raw = body.get("data") if isinstance(body, dict) else None
            report = normalize_report(raw)
            if raw.get("schema_version") != 2:
                raise ValueError("Chỉ nhập analysis.json phiên bản schema 2 từ skill")
            if report.get("demo"):
                raise ValueError("Không thể nhập dữ liệu demo hư cấu vào danh sách khách hàng")
            conn = db()
            added = 0
            for p in report.get("prospects", []):
                existing = conn.execute("SELECT id FROM leads WHERE id=?", (p["id"],)).fetchone()
                if existing:
                    continue
                route = p.get("contact_route", {})
                conn.execute("""INSERT INTO leads (
                    id, company, company_url, industry, location, score, stage, pain_signal,
                    evidence, source_type, source_title, source_url, signal_date, checked_at,
                    target_role, contact_url, contact_label, why_fit, why_now, dimensions_json,
                    next_step, caution, status, note, project_key, imported_at, updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                    p["id"], p["name"], p.get("entity_url"), p.get("industry", ""),
                    ", ".join(str(item) for item in raw.get("target_profile", {}).get("geography", [])) if isinstance(raw.get("target_profile", {}).get("geography", []), list) else str(raw.get("target_profile", {}).get("geography", "")),
                    p["score"], p.get("stage"), p.get("pain_signal"), p.get("evidence"),
                    p.get("source_type"), p.get("source_title"), p.get("source_url"),
                    p.get("signal_date"), p.get("checked_at"), p.get("target_role"),
                    route.get("url") if route.get("status") == "verified" else None,
                    route.get("label"), p.get("why_fit"), p.get("why_now"),
                    json.dumps(p.get("dimensions", {}), ensure_ascii=False), p.get("next_step"),
                    p.get("caution"), "new", "", raw.get("project_key"), now(), now(),
                ))
                added += 1
            conn.commit()
            conn.close()
            return self._json({"added": added, "duplicates": len(report.get("prospects", [])) - added})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            return self._json({"error": str(exc)}, 400)

    def do_PATCH(self):
        match = re.fullmatch(r"/api/leads/([^/]+)", urlparse(self.path).path)
        if not match:
            return self._json({"error": "Không tìm thấy lead"}, 404)
        try:
            body = self._body()
            allowed = {k: body[k] for k in ("status", "note") if k in body}
            if not allowed or set(body) - {"status", "note"}:
                raise ValueError("Chỉ được cập nhật trạng thái hoặc ghi chú")
            if "status" in allowed and allowed["status"] not in STATUSES:
                raise ValueError("Trạng thái không hợp lệ")
            if "note" in allowed and (not isinstance(allowed["note"], str) or len(allowed["note"]) > 4000):
                raise ValueError("Ghi chú cần là văn bản dưới 4.000 ký tự")
            allowed["updated_at"] = now()
            conn = db()
            lead_id = unquote(match.group(1))
            assignments = ", ".join(f"{key}=?" for key in allowed)
            cursor = conn.execute(f"UPDATE leads SET {assignments} WHERE id=?", (*allowed.values(), lead_id))
            conn.commit()
            row = conn.execute("SELECT * FROM leads WHERE id=?", (lead_id,)).fetchone() if cursor.rowcount else None
            conn.close()
            if not row:
                return self._json({"error": "Không tìm thấy lead"}, 404)
            return self._json({"lead": lead_dict(row)})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            return self._json({"error": str(exc)}, 400)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1", choices=["127.0.0.1", "localhost"])
    parser.add_argument("--port", type=int, default=4317)
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()
    if not (1024 <= args.port <= 65535):
        parser.error("Port phải nằm trong khoảng 1024 đến 65535")
    conn = db()
    conn.close()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Vietnam Lead Finder đang chạy tại http://{args.host}:{args.port}")
    print(f"Dữ liệu local: {DB_PATH}")
    if args.open:
        webbrowser.open(f"http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng dashboard.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
