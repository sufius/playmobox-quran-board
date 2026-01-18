#!/usr/bin/env python3
# Example fix: merges an entry with empty "arabic" into the previous segment's
# translation/transcription, then deletes the empty entry and reindexes.
import argparse
import json
from pathlib import Path


def merge_into_previous(prev, current, field):
    cur_val = current.get(field, "")
    if cur_val is None:
        cur_val = ""
    cur_val = str(cur_val)
    if cur_val.strip() == "":
        return

    prev_val = prev.get(field, "")
    if prev_val is None:
        prev_val = ""
    prev_val = str(prev_val)

    if prev_val.strip() == "":
        prev[field] = cur_val.strip()
    else:
        prev[field] = prev_val.rstrip() + " " + cur_val.lstrip()


def merge_file(path: Path, dry_run: bool) -> tuple[int, int, bool]:
    data = json.loads(path.read_text(encoding="utf-8"))
    data.sort(key=lambda item: item.get("index", 0))

    new_data = []
    removed = 0
    no_prev = 0

    for item in data:
        arabic = item.get("arabic", "")
        if arabic is None:
            arabic = ""
        if str(arabic).strip() == "":
            removed += 1
            if new_data:
                prev = new_data[-1]
                merge_into_previous(prev, item, "translation")
                merge_into_previous(prev, item, "transcription")
            else:
                no_prev += 1
            continue
        new_data.append(item)

    if removed:
        for idx, item in enumerate(new_data, start=1):
            item["index"] = idx
        if not dry_run:
            path.write_text(
                json.dumps(new_data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    return removed, no_prev, removed > 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Merge empty-arabic entries into the previous segment's "
            "translation/transcription, then delete and reindex."
        )
    )
    parser.add_argument(
        "--base-dir",
        default="public/surat/segmented/de/27",
        help="Directory containing segmented surah JSON files.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute changes without writing files.",
    )
    args = parser.parse_args()

    script_root = Path(__file__).resolve().parent.parent
    base_dir = Path(args.base_dir)
    if not base_dir.is_absolute():
        base_dir = script_root / base_dir

    files = sorted(base_dir.glob("*.json"))
    total_removed = 0
    total_no_prev = 0
    files_changed = 0

    for path in files:
        removed, no_prev, changed = merge_file(path, args.dry_run)
        total_removed += removed
        total_no_prev += no_prev
        if changed:
            files_changed += 1

    print(f"files_changed={files_changed}")
    print(f"removed_entries={total_removed}")
    print(f"no_previous_entries={total_no_prev}")
    if args.dry_run and files_changed:
        print("dry-run: no files were written")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
