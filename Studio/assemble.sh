#!/usr/bin/env bash
set -euo pipefail

studio="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="${1:-$studio/../studio-build}"
archive="$studio/../IA-Next-Android-Codebase.zip"
archive_sha=b24537072963abca9f34a4e355ac6b46fde29d0c2fba818af42aca427d8c4cb5

printf '%s  %s\n' "$archive_sha" "$archive" | sha256sum --check --status
mkdir -- "$out"
out="$(cd "$out" && pwd)"
mkdir "$out/android-source" "$out/web"
cp -R "$studio/android" "$out/android-source/android"
cp -R "$studio/dashboard" "$out/android-source/dist"
cp "$studio/ANDROID.md" "$out/android-source/README.md"
unzip -q "$archive" 'dist/brand/*' 'dist/ocr/*' 'android/assets/raster-srgb.icc' 'android/src/fi/iki/elonen/NanoHTTPD.java' -d "$out/android-source"

cp -R "$studio/web/." "$out/web/"
cp -R "$out/android-source/dist" "$out/web/xxxznx/public/studio"
