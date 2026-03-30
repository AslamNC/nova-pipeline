#!/bin/bash

# Nova Pipeline — sync script
# Run this after Claude makes code changes: ./sync.sh

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
DOWNLOADS="$HOME/Downloads"

echo "🔄 Nova Pipeline sync starting..."

MOVED=0

# Usage: move_file "downloaded-name.js" "repo/path/file.js"
move_file() {
  local FILENAME="$1"
  local TARGET="$2"
  local NAME="${FILENAME%.*}"
  local EXT="${FILENAME##*.}"

  # Find newest file matching exact name OR numbered variant e.g. "name (1).js"
  local LATEST
  LATEST=$(find "$DOWNLOADS" -maxdepth 1 -name "${NAME}*.${EXT}" 2>/dev/null \
    | xargs ls -t 2>/dev/null | head -n 1)

  if [ -n "$LATEST" ] && [ -f "$LATEST" ]; then
    mkdir -p "$REPO_DIR/$(dirname "$TARGET")"
    cp "$LATEST" "$REPO_DIR/$TARGET"
    # Clean up all variants
    find "$DOWNLOADS" -maxdepth 1 -name "${NAME}*.${EXT}" -delete 2>/dev/null || true
    echo "  ✓ $(basename "$LATEST") → $TARGET"
    MOVED=$((MOVED + 1))
  fi
}

# API routes
move_file "research-route.js"      "app/api/research/route.js"
move_file "email-route.js"         "app/api/email/route.js"
move_file "find-route.js"          "app/api/find/route.js"
move_file "find-contacts-route.js" "app/api/find-contacts/route.js"

# Pages
move_file "page.js"                "app/page.js"
move_file "e01_page.js"            "app/e01/page.js"
move_file "e02_page.js"            "app/e02/page.js"
move_file "e03_page.js"            "app/e03/page.js"
move_file "dashboard_page.js"      "app/dashboard/page.js"
move_file "layout.js"              "app/layout.js"
move_file "globals.css"            "app/globals.css"

# Components
move_file "DetailPanel.js"         "components/DetailPanel.js"
move_file "AddLeadModal.js"        "components/AddLeadModal.js"
move_file "Nav.js"                 "components/Nav.js"

# Lib
move_file "utils.js"               "lib/utils.js"
move_file "supabase.js"            "lib/supabase.js"

if [ $MOVED -eq 0 ]; then
  echo "  No new files found in Downloads. Nothing to move."
else
  echo "  Moved $MOVED file(s)"
fi

# Git: stage, commit, push
cd "$REPO_DIR"

if git diff --quiet && git diff --cached --quiet; then
  echo "  No git changes detected."
else
  git add .
  COMMIT_MSG="Update $(date '+%Y-%m-%d %H:%M')"
  git commit -m "$COMMIT_MSG"
  git push
  echo "  ✅ Pushed to GitHub: $COMMIT_MSG"
fi

echo "🚀 Done! Vercel will deploy automatically."
