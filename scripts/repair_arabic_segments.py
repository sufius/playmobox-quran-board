#!/usr/bin/env python3
import argparse
import difflib
import json
import re
from collections import defaultdict
from pathlib import Path

WS_RE = re.compile(r"\s+")
PUNCT = set(
    ".,;:!?"
    "\u060c\u061b\u061f"
    "\u06d6\u06d7\u06d8\u06d9\u06da\u06db\u06dc\u06dd\u06de\u06df"
    "\u06e0\u06e1\u06e2\u06e3\u06e4\u06e5\u06e6\u06e7\u06e8\u06e9\u06ea"
)


def normalize_ws(text: str) -> str:
    return WS_RE.sub("", text)


def is_safe_boundary(full: str, pos: int) -> bool:
    if pos <= 0 or pos >= len(full):
        return True
    prev = full[pos - 1]
    nxt = full[pos]
    return prev.isspace() or nxt.isspace() or prev in PUNCT or nxt in PUNCT


def fix_segments(full: str, segments: list[str], max_adjust: int) -> list[str]:
    seg_ranges = []
    pos = 0
    for seg in segments:
        start = pos
        pos += len(seg)
        seg_ranges.append((start, pos))

    concat = "".join(segments)
    matcher = difflib.SequenceMatcher(None, concat, full)
    blocks = matcher.get_matching_blocks()

    count = len(segments)
    min_f = [None] * count
    max_f = [None] * count
    for i, (seg_start, seg_end) in enumerate(seg_ranges):
        for block in blocks:
            if block.size == 0:
                continue
            c_start = block.a
            c_end = block.a + block.size
            if c_end <= seg_start or c_start >= seg_end:
                continue
            overlap_start = max(seg_start, c_start)
            overlap_end = min(seg_end, c_end)
            f_overlap_start = block.b + (overlap_start - c_start)
            f_overlap_end = block.b + (overlap_end - c_start) - 1
            if min_f[i] is None or f_overlap_start < min_f[i]:
                min_f[i] = f_overlap_start
            if max_f[i] is None or f_overlap_end > max_f[i]:
                max_f[i] = f_overlap_end

    concat_len = len(concat)
    full_len = len(full)
    scale = full_len / concat_len if concat_len else 1.0
    expected = [max(0, int(round(len(seg) * scale))) for seg in segments]

    start = 0
    boundaries = []
    for i in range(count - 1):
        end = None
        if max_f[i] is not None and min_f[i + 1] is not None:
            if max_f[i] + 1 <= min_f[i + 1]:
                end = min_f[i + 1]
            else:
                end = max_f[i] + 1
        elif max_f[i] is not None:
            end = max_f[i] + 1
        elif min_f[i + 1] is not None:
            end = min_f[i + 1]
        else:
            end = start + expected[i]

        if end < start:
            end = start
        if end > full_len:
            end = full_len

        if not is_safe_boundary(full, end):
            for delta in range(1, max_adjust + 1):
                if end + delta <= full_len and is_safe_boundary(full, end + delta):
                    end = end + delta
                    break
                if end - delta >= start and is_safe_boundary(full, end - delta):
                    end = end - delta
                    break

        boundaries.append(end)
        start = end

    boundaries.append(full_len)
    starts = [0] + boundaries[:-1]
    return [full[s:e] for s, e in zip(starts, boundaries)]


def fix_file(path: Path, dry_run: bool, max_adjust: int) -> tuple[bool, int]:
    data = json.loads(path.read_text(encoding="utf-8"))
    by_verse: dict[int, list[dict]] = defaultdict(list)
    for seg in data:
        by_verse[seg["verse_number"]].append(seg)

    changed = False
    fixed_verses = 0
    for verse, segs in by_verse.items():
        segs.sort(key=lambda s: s["index"])
        full = segs[0].get("arabic_full", "")
        if not full:
            continue
        concat = "".join(s.get("arabic", "") for s in segs)
        if normalize_ws(concat) == normalize_ws(full):
            continue
        new_segments = fix_segments(full, [s.get("arabic", "") for s in segs], max_adjust)
        for seg, new_val in zip(segs, new_segments):
            if seg.get("arabic") != new_val:
                seg["arabic"] = new_val
                changed = True
        fixed_verses += 1

    if changed and not dry_run:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return changed, fixed_verses


def count_mismatches(paths: list[Path]) -> int:
    mismatches = 0
    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        by_verse: dict[int, list[dict]] = defaultdict(list)
        for seg in data:
            by_verse[seg["verse_number"]].append(seg)
        for verse, segs in by_verse.items():
            segs.sort(key=lambda s: s["index"])
            full = segs[0].get("arabic_full", "")
            if not full:
                continue
            concat = "".join(s.get("arabic", "") for s in segs)
            if normalize_ws(concat) != normalize_ws(full):
                mismatches += 1
    return mismatches


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Repair arabic segment concatenation mismatches."
    )
    parser.add_argument(
        "--base-dir",
        default="public/surat/segmented/de/27",
        help="Directory containing segmented surah JSON files.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute fixes without writing files.",
    )
    parser.add_argument(
        "--max-adjust",
        type=int,
        default=6,
        help="Max boundary adjustment to reach safe split points.",
    )
    args = parser.parse_args()

    script_root = Path(__file__).resolve().parent.parent
    base_dir = Path(args.base_dir)
    if not base_dir.is_absolute():
        base_dir = script_root / base_dir
    paths = sorted(base_dir.glob("*.json"))

    changed_files = 0
    fixed_verses = 0
    for path in paths:
        changed, fixed = fix_file(path, args.dry_run, args.max_adjust)
        fixed_verses += fixed
        if changed:
            changed_files += 1

    remaining = count_mismatches(paths)
    print(f"fixed_verses={fixed_verses} changed_files={changed_files}")
    print(f"remaining_mismatches={remaining}")
    if args.dry_run and changed_files:
        print("dry-run: no files were written")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
