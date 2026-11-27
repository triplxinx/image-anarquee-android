#!/usr/bin/env bash
set -euo pipefail
project="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${ANDROID_SDK_ROOT:?Set ANDROID_SDK_ROOT to the SDK location.}"
: "${ARCHIVE_KEYSTORE:?Set ARCHIVE_KEYSTORE to the signing keystore path.}"
: "${ARCHIVE_KEY_PASSWORD:?Set ARCHIVE_KEY_PASSWORD in the environment.}"
tools="${ANDROID_BUILD_TOOLS:-$ANDROID_SDK_ROOT/build-tools/35.0.0}"
platform="${ANDROID_PLATFORM_JAR:-$ANDROID_SDK_ROOT/platforms/android-35/android.jar}"
out="${1:-$project/Archive-Launch-Desk.apk}"
out="$(realpath -m "$out")"
mkdir -p "$(dirname "$out")"
build="$(mktemp -d)"
trap 'rm -rf "$build"' EXIT
mkdir -p "$build/classes" "$build/dex" "$build/assets/desk"
cp "$project/dist/catalog.json" "$build/assets/"
cp "$project/dist/catalog.json" "$build/assets/desk/"
cp -r "$project/dist/ocr" "$build/assets/desk/"
cp -r "$project/dist/brand" "$build/assets/desk/"
cp -r "$project/android/assets/." "$build/assets/"
for name in wide-net.js studio-render.js studio.js cards.js cards-sources.json help.js merch.js promoters.js affiliate.js index.html styles.css app.js licensing.js leads.js plan.js intake.js idle.js workdesk.js; do
  cp "$project/dist/$name" "$build/assets/desk/"
done
"$tools/aapt2" compile --dir "$project/android/res" -o "$build/resources.zip"
package_options=()
ARCHIVE_APPLICATION_ID="${ARCHIVE_APPLICATION_ID:-studio.ellis.archivedesk.next}"
if [[ -n "${ARCHIVE_APPLICATION_ID:-}" ]]; then
  package_options=(--rename-manifest-package "$ARCHIVE_APPLICATION_ID" --custom-package studio.ellis.archivedesk.studio)
fi
"$tools/aapt2" link "${package_options[@]}" -o "$build/base.apk" -I "$platform" --manifest "$project/android/AndroidManifest.xml" -A "$build/assets" --java "$build" "$build/resources.zip"
mapfile -t sources < <(find "$project/android/src" "$build/studio" -type f -name '*.java' | sort)
if command -v javac >/dev/null; then
  javac --release 8 -classpath "$platform" -d "$build/classes" "${sources[@]}"
else
  : "${ARCHIVE_ECJ_JAR:?Provide a JDK or set ARCHIVE_ECJ_JAR to an Eclipse compiler JAR.}"
  java -jar "$ARCHIVE_ECJ_JAR" -source 8 -target 8 -bootclasspath "$platform:$tools/core-lambda-stubs.jar" -d "$build/classes" "${sources[@]}"
fi
(cd "$build/classes" && zip -q -r "$build/classes.jar" .)
"$tools/d8" --min-api 23 --lib "$platform" --output "$build/dex" "$build/classes.jar"
(cd "$build/dex" && zip -q -0 "$build/base.apk" classes.dex)
"$tools/zipalign" -f 4 "$build/base.apk" "$build/aligned.apk"
"$tools/apksigner" sign --ks "$ARCHIVE_KEYSTORE" --ks-key-alias "${ARCHIVE_KEY_ALIAS:-archive}" --ks-pass env:ARCHIVE_KEY_PASSWORD --out "$out" "$build/aligned.apk"
"$tools/apksigner" verify --print-certs "$out"
