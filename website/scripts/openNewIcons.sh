#!/usr/bin/env bash

set -e

BASE_URL="http://localhost:3000/icon"

# Collect newly added files (staged + untracked)
files=$(
  {
    git diff --cached --name-only --diff-filter=A
    git ls-files --others --exclude-standard
  } | sort -u
)

if [[ -z "$files" ]]; then
  echo "No newly added files found."
  exit 0
fi

# Collect unique folders
folders=()
for file in $files; do
  dir=$(dirname "$file")
  folderName=$(basename "$dir")

  # Avoid duplicates
  if [[ ! " ${folders[*]} " =~ " ${folderName} " ]]; then
    folders+=("$folderName")
  fi
done

# Open URLs in browser
for folderName in "${folders[@]}"; do
  url="${BASE_URL}/${folderName}"
  echo "Opening: $url"

  if command -v open >/dev/null; then
    open "$url"             # macOS
  elif command -v xdg-open >/dev/null; then
    xdg-open "$url"         # Linux
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows Git Bash — open browser without leaving Bash
    powershell.exe -Command "Start-Process '$url'"
  else
    echo "Could not open browser for $url"
  fi
done
