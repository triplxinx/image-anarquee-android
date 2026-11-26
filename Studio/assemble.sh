#!/usr/bin/env bash
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${1:-$repo/studio-build}"
mkdir -- "$out"
out="$(cd "$out" && pwd)"
mkdir "$out/android-source" "$out/web"
unzip -q "$repo/IA-Next-Android-Codebase.zip" -d "$out/android-source"
cp -R "$repo/Studio/android-overlay/." "$out/android-source/"
cp -R "$repo/Studio/web/." "$out/web/"
mkdir "$out/web/xxxznx/public/studio"
cp -R "$out/android-source/dist/." "$out/web/xxxznx/public/studio/"
