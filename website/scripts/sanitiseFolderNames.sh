#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

for dir in */; do
    real="${dir%/}"   # exact filesystem name
    work="$real"     # working copy

    # Remove "Reupload"
    work="$(sed -E 's/[[:space:]]*reupload[[:space:]]*//Ig' <<< "$work")"

    # Check if folder has a space (regular or full-width) after the ID prefix
    [[ "$work" != *" "* && "$work" != *"　"* ]] && continue

    # Split on first space (regular or full-width)
    if [[ "$work" == *" "* ]]; then
        prefix="${work%% *}"
        rest="${work#* }"
    else
        prefix="${work%%　*}"
        rest="${work#*　}"
    fi

    paren=""
    if [[ "$rest" =~ \((.*)\) ]]; then
        paren="${BASH_REMATCH[1]}"
        rest="${rest%%\(*}"
    fi

    normalize() {
        printf '%s' "$1" \
        | iconv -f UTF-8 -t ASCII//TRANSLIT//IGNORE 2>/dev/null \
        | tr '[:upper:]' '[:lower:]' \
        | tr -cd 'a-z0-9_-'
    }

    base="$(normalize "$rest")"
    extra="$(normalize "$paren")"

    if [[ -n "$extra" ]]; then
        name="${base}-${extra}"
    else
        name="$base"
    fi

    # If name is empty (all non-ASCII chars), fall back to the prefix
    if [[ -z "$name" ]]; then
        name="$(normalize "$prefix")"
    fi

    [[ -z "$name" ]] && continue

    if [[ -e "$name" && "$name" != "$real" ]]; then
        echo "Skipping (collision): '$real' -> '$name'"
        continue
    fi

    if [[ "$real" != "$name" ]]; then
        echo "Renaming: '$real' -> '$name'"
        mv -- "$real" "$name"
    fi
done
