#!/usr/bin/env python3
"""Fill missing transcription fields in segmented surah files."""

import argparse
import json
from pathlib import Path


def is_missing_transcription(item: dict) -> bool:
    if "transcription" not in item:
        return True
    value = item.get("transcription")
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return False


def load_transcription_map(path: Path) -> dict[int, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    verse_to_transcription: dict[int, str] = {}

    for item in data:
        verse_number = item.get("verse_number")
        transcription = item.get("transcription")
        if verse_number is None:
            continue
        if transcription is None:
            continue
        transcription = str(transcription).strip()
        if not transcription:
            continue
        verse_to_transcription[int(verse_number)] = transcription

    return verse_to_transcription


def fix_file(segmented_path: Path, transcription_path: Path, dry_run: bool) -> tuple[int, int]:
    verse_map = load_transcription_map(transcription_path)
    data = json.loads(segmented_path.read_text(encoding="utf-8"))

    fixed_count = 0
    unresolved_count = 0

    for item in data:
        if not is_missing_transcription(item):
            continue

        verse_number = item.get("verse_number")
        if verse_number is None:
            unresolved_count += 1
            continue

        transcription = verse_map.get(int(verse_number))
        if not transcription:
            unresolved_count += 1
            continue

        item["transcription"] = transcription
        fixed_count += 1

    if fixed_count > 0 and not dry_run:
        segmented_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    return fixed_count, unresolved_count


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Fill missing transcription values in segmented surah files by using "
            "the matching verse transcription from public/surat/transcription."
        )
    )
    parser.add_argument(
        "--segmented-dir",
        default="public/surat/segmented/de/27",
        help="Directory containing segmented surah JSON files.",
    )
    parser.add_argument(
        "--transcription-dir",
        default="public/surat/transcription",
        help="Directory containing verse-level transcription JSON files.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change without writing files.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent

    segmented_dir = Path(args.segmented_dir)
    if not segmented_dir.is_absolute():
        segmented_dir = repo_root / segmented_dir

    transcription_dir = Path(args.transcription_dir)
    if not transcription_dir.is_absolute():
        transcription_dir = repo_root / transcription_dir

    files_changed = 0
    total_fixed = 0
    total_unresolved = 0
    missing_transcription_files = 0

    for segmented_path in sorted(segmented_dir.glob("surah-*.json")):
        transcription_path = transcription_dir / segmented_path.name
        if not transcription_path.exists():
            missing_transcription_files += 1
            print(f"skip: missing transcription file for {segmented_path.name}")
            continue

        fixed_count, unresolved_count = fix_file(
            segmented_path=segmented_path,
            transcription_path=transcription_path,
            dry_run=args.dry_run,
        )

        if fixed_count > 0:
            files_changed += 1
            print(f"{segmented_path.name}: fixed={fixed_count}")
        if unresolved_count > 0:
            print(f"{segmented_path.name}: unresolved={unresolved_count}")

        total_fixed += fixed_count
        total_unresolved += unresolved_count

    print(f"files_changed={files_changed}")
    print(f"fixed_transcriptions={total_fixed}")
    print(f"unresolved={total_unresolved}")
    print(f"missing_transcription_files={missing_transcription_files}")
    if args.dry_run and files_changed:
        print("dry-run: no files were written")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
