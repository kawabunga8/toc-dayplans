#!/usr/bin/env python3
import re
import subprocess
from pathlib import Path

def pdftotext_layout(pdf_path: Path) -> str:
    return subprocess.check_output([
        "pdftotext",
        "-layout",
        str(pdf_path),
        "-",
    ], text=True)

def slug_key(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s

def parse_pdf(subject: str, pdf_path: Path, source_pdf_path: str):
    text = pdftotext_layout(pdf_path)
    lines = text.splitlines()

    # heading patterns
    if subject == "ADST":
        heading_re = re.compile(r"^ADST\s+Learning\s+Standard:\s+(.*\S)\s*$")
    elif subject == "Bible":
        heading_re = re.compile(r"^BIBLE\s+Learning\s+Standard:\s+(.*\S)\s*$")
    elif subject == "FA":
        heading_re = re.compile(r"^Learning\s+Standard:\s+(.*\S)\s*$")
    else:
        raise ValueError(subject)

    # Find the column header line and compute fixed column start positions.
    header_marker = "Emerging/Emerging+"

    standards = []

    cur = None

    def flush_grade():
        nonlocal cur
        if not cur or cur.get("grade") is None:
            return
        grade = cur["grade"]
        cell = cur["cell"]
        out = {}
        for lvl in ("emerging", "developing", "proficient", "extending"):
            parts = [p.rstrip() for p in cell[lvl] if p.strip()]
            # Keep line breaks when it looks like bullets.
            joined = "\n".join([re.sub(r"\s+$", "", p) for p in parts]).strip()
            out[lvl] = joined
        cur["std"]["rubrics"][grade] = out
        cur["grade"] = None
        for lvl in cell:
            cell[lvl].clear()

    def flush_standard():
        nonlocal cur
        if not cur:
            return
        flush_grade()
        standards.append(cur["std"])
        cur = None

    i = 0
    while i < len(lines):
        line = lines[i]

        m = heading_re.match(line.strip())
        if m:
            flush_standard()
            title = m.group(1).strip()
            cur = {
                "std": {
                    "subject": subject,
                    "standard_title": title,
                    "standard_key": slug_key(title),
                    "source_pdf_path": source_pdf_path,
                    "rubrics": {},
                },
                "col_starts": None,
                "grade": None,
                "cell": {
                    "emerging": [],
                    "developing": [],
                    "proficient": [],
                    "extending": [],
                },
            }
            i += 1
            continue

        if not cur:
            i += 1
            continue

        if header_marker in line:
            # The header text is centered; infer column start positions from the
            # first content line after the header (pdftotext -layout preserves fixed widths).
            def infer_starts_from_line(s: str):
                starts = []
                # start of first column
                m0 = re.search(r"\S", s)
                if not m0:
                    return None
                starts.append(m0.start())
                pos = starts[0]
                for _ in range(3):
                    # find a run of 2+ spaces followed by a non-space
                    m = re.search(r" {2,}(?=\S)", s[pos + 1 :])
                    if not m:
                        return None
                    gap_start = pos + 1 + m.start()
                    gap_end = pos + 1 + m.end()
                    starts.append(gap_end)
                    pos = gap_end
                return starts

            sample = None
            for j in range(i + 1, min(i + 12, len(lines))):
                cand = lines[j]
                if not cand.strip():
                    continue
                # skip grade-only lines
                if re.match(r"^\s*(9|10|11|12)\s*$", cand):
                    continue
                sample = cand
                break

            if sample:
                starts = infer_starts_from_line(sample)
                if starts and len(starts) == 4:
                    cur["col_starts"] = starts
            i += 1
            continue

        if not cur.get("col_starts"):
            i += 1
            continue

        starts = cur["col_starts"]
        # slice areas
        prefix = line[: starts[0]]
        g = None
        m1 = re.match(r"^\s*(9|10|11|12)\s*$", prefix)
        if m1:
            g = int(m1.group(1))
        else:
            m2 = re.match(r"^\s*(9|10|11|12)\b", prefix)
            if m2:
                g = int(m2.group(1))

        if g is not None and g != cur.get("grade"):
            flush_grade()
            cur["grade"] = g

        # Some PDFs (notably ADST) put the first grade's rubric text *before* the grade number.
        # If we see rubric text and haven't assigned a grade yet, assume the first grade is 9.
        if cur.get("grade") is None:
            # If we've not recorded any rubrics yet for this standard, auto-start grade 9.
            if not cur["std"]["rubrics"] and line[starts[0]:].strip():
                cur["grade"] = 9
            else:
                i += 1
                continue

        # slice columns by starts; end at next start
        slices = [
            ("emerging", line[starts[0] : starts[1]]),
            ("developing", line[starts[1] : starts[2]]),
            ("proficient", line[starts[2] : starts[3]]),
            ("extending", line[starts[3] :]),
        ]
        for lvl, seg in slices:
            # Strip only right; keep leading for bullet indentation.
            seg2 = seg.rstrip("\n").rstrip()
            # If cell is entirely empty, skip.
            if seg2.strip():
                cur["cell"][lvl].append(seg2)

        i += 1

    flush_standard()

    # remove empty grades
    for std in standards:
        std["rubrics"] = {g: r for g, r in std["rubrics"].items() if any(v.strip() for v in r.values())}

    return standards

def sql_dollar_quote(s: str, tag: str = "txt") -> str:
    # Use a tag that doesn't appear in the string
    t = tag
    while f"${t}$" in s:
        t += "x"
    return f"${t}$" + s + f"${t}$"

def to_seed_sql(all_standards: list[dict]) -> str:
    out = []
    out.append("-- Seed learning standards + rubrics from PDFs\n")
    out.append("begin;\n")

    for std in all_standards:
        subject = std["subject"]
        skey = std["standard_key"]
        title = std["standard_title"]
        src = std.get("source_pdf_path")

        out.append(
            "\n-- "
            + f"{subject} / {title}"
            + "\n"
        )
        out.append(
            "insert into public.learning_standards (subject, standard_key, standard_title, source_pdf_path, updated_at)\n"
            + f"values ({sql_dollar_quote(subject,'s')}, {sql_dollar_quote(skey,'k')}, {sql_dollar_quote(title,'t')}, {sql_dollar_quote(src or '', 'p')}, now())\n"
            + "on conflict (subject, standard_key) do update\n"
            + "set standard_title = excluded.standard_title,\n"
            + "    source_pdf_path = excluded.source_pdf_path,\n"
            + "    updated_at = now();\n"
        )

        # rubrics
        rubrics = std.get("rubrics", {})
        for grade in sorted(rubrics.keys()):
            for lvl in ("emerging", "developing", "proficient", "extending"):
                txt = (rubrics[grade].get(lvl) or "").strip()
                if not txt:
                    continue
                out.append(
                    "insert into public.learning_standard_rubrics (learning_standard_id, grade, level, original_text, updated_at)\n"
                    + "select ls.id, "
                    + str(int(grade))
                    + ", "
                    + sql_dollar_quote(lvl, 'lvl')
                    + ", "
                    + sql_dollar_quote(txt, 'txt')
                    + ", now()\n"
                    + "from public.learning_standards ls\n"
                    + "where ls.subject = "
                    + sql_dollar_quote(subject, 's')
                    + " and ls.standard_key = "
                    + sql_dollar_quote(skey, 'k')
                    + "\n"
                    + "on conflict (learning_standard_id, grade, level) do update\n"
                    + "set original_text = excluded.original_text,\n"
                    + "    updated_at = now();\n"
                )

    out.append("\ncommit;\n")
    return "".join(out)


def main():
    base = Path(__file__).resolve().parents[1]
    pdf_dir = base / "tmp" / "learning-standards"
    specs = [
        ("ADST", pdf_dir / "adst.pdf", "Learning Standards/FINAL ADST 9-12 Rubrics-2.pdf"),
        ("FA", pdf_dir / "fine-arts.pdf", "Learning Standards/FINAL Fine Arts 9-12 Rubrics-2.pdf"),
        ("Bible", pdf_dir / "bible.pdf", "Learning Standards/FINAL Bible 9-12 Rubrics - Done.pdf"),
    ]

    all_standards = []
    for subject, path, src in specs:
        if not path.exists():
            raise SystemExit(f"Missing {path}")
        all_standards.extend(parse_pdf(subject, path, src))

    # Write artifacts
    out_dir = base / "tmp" / "learning-standards" / "out"
    out_dir.mkdir(parents=True, exist_ok=True)

    import json

    (out_dir / "learning-standards.json").write_text(json.dumps(all_standards, indent=2), encoding="utf-8")
    (out_dir / "seed_learning_standards.sql").write_text(to_seed_sql(all_standards), encoding="utf-8")

    # Summary
    counts = {}
    for s in all_standards:
        counts.setdefault(s['subject'], 0)
        counts[s['subject']] += 1
    print("Parsed standards:", counts)


if __name__ == "__main__":
    main()
