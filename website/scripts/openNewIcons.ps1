#!/usr/bin/env pwsh

param(
    [Parameter(Position = 0)]
    [string]$CommitSha
)

$ErrorActionPreference = "Stop"

$BASE_URL = "http://localhost:3000/icon"

$files = @()

if ($CommitSha) {
    # Use files from the specified commit
    Write-Host "Checking commit: $CommitSha"
    $files = git diff-tree --no-commit-id --name-only -r $CommitSha --diff-filter=AM
} else {
    # Collect newly added and modified files (staged + unstaged + untracked)
    $files += git diff --cached --name-only --diff-filter=AM
    $files += git diff --name-only --diff-filter=AM
    $files += git ls-files --others --exclude-standard
}

# Remove empty lines and duplicates
$files = $files | Where-Object { $_ -and $_.Trim() -ne "" } | Sort-Object -Unique

if (-not $files -or $files.Count -eq 0) {
    Write-Host "No newly added files found."
    exit 0
}

# Collect unique folders
$folders = @()

foreach ($file in $files) {
    $dir = Split-Path $file -Parent

    if ($dir) {
        $folderName = Split-Path $dir -Leaf

        if ($folderName -and ($folders -notcontains $folderName)) {
            $folders += $folderName
        }
    }
}

# Open URLs in browser
foreach ($folderName in $folders) {
    $url = "$BASE_URL/$folderName"
    Write-Host "Opening: $url"

    Start-Process $url
}