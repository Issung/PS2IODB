#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Name {
    param([string]$Text)

    # Transliterate common accented/diacritic characters to ASCII equivalents
    $normalized = $Text.Normalize([System.Text.NormalizationForm]::FormD)
    $ascii = [System.Text.StringBuilder]::new()
    foreach ($char in $normalized.ToCharArray()) {
        $category = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
        if ($category -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$ascii.Append($char)
        }
    }

    $result = $ascii.ToString().ToLower()

    # Keep only a-z, 0-9, underscore, hyphen
    $result = [regex]::Replace($result, '[^a-z0-9_-]', '')
    return $result
}

$dirs = Get-ChildItem -Path . -Directory

foreach ($dir in $dirs) {
    $real = $dir.Name
    $work = $real

    # Remove "reupload" (case-insensitive, with surrounding spaces)
    $work = [regex]::Replace($work, '\s*reupload\s*', '', 'IgnoreCase')

    # Full-width space U+3000
    $fullWidthSpace = [char]0x3000

    $hasRegularSpace   = $work.Contains(' ')
    $hasFullWidthSpace = $work.Contains($fullWidthSpace)

    # Skip if no space separator at all
    if (-not $hasRegularSpace -and -not $hasFullWidthSpace) { continue }

    # Split on first space (regular preferred, then full-width)
    if ($hasRegularSpace) {
        $spaceIdx = $work.IndexOf(' ')
    } else {
        $spaceIdx = $work.IndexOf($fullWidthSpace)
    }

    $prefix = $work.Substring(0, $spaceIdx)
    $rest   = $work.Substring($spaceIdx + 1)

    # Extract parenthesised suffix, e.g. "(foo bar)"
    $paren = ''
    $parenMatch = [regex]::Match($rest, '\(([^)]*)\)')
    if ($parenMatch.Success) {
        $paren = $parenMatch.Groups[1].Value
        $rest  = $rest.Substring(0, $rest.IndexOf('('))
    }

    $base  = Normalize-Name $rest
    $extra = Normalize-Name $paren

    if ($extra) {
        $name = "$base-$extra"
    } else {
        $name = $base
    }

    # Fall back to prefix when all chars were non-ASCII
    if (-not $name) {
        $name = Normalize-Name $prefix
    }

    if (-not $name) { continue }

    $targetExists = Test-Path -LiteralPath $name

    if ($targetExists -and ($name -ne $real)) {
        Write-Host "Skipping (collision): '$real' -> '$name'"
        continue
    }

    if ($real -ne $name) {
        Write-Host "Renaming: '$real' -> '$name'"
        Rename-Item -LiteralPath $real -NewName $name
    }
}