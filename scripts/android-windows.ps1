param([switch]$Clean)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

# Keep Node, Gradle and codegen on the same real drive. SUBST aliases can
# produce mixed C:/M: paths that Kotlin cannot relativize.
Write-Host "Building from $projectRoot with CMake 3.31.1 (Expo config plugin)"

if ($Clean) {
    $caches = @(
        'android/build', 'android/.cxx', 'android/.gradle',
        'android/app/build', 'android/app/.cxx',
        'node_modules/react-native-reanimated/android/build',
        'node_modules/react-native-reanimated/android/.cxx',
        'node_modules/react-native-worklets/android/build',
        'node_modules/react-native-worklets/android/.cxx',
        'node_modules/react-native-safe-area-context/android/build',
        'node_modules/react-native-safe-area-context/android/.cxx',
        'node_modules/react-native-gesture-handler/android/build',
        'node_modules/react-native-gesture-handler/android/.cxx',
        'node_modules/react-native-screens/android/build',
        'node_modules/react-native-screens/android/.cxx'
    )
    foreach ($cache in $caches) {
        $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $cache))
        if (!$target.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Cache path is outside the project: $target"
        }
        # Windows PowerShell needs extended-length paths to remove deep CMake
        # output. Only the explicit generated cache directories above are removed.
        $cleanupTarget = '\\?\' + $target
        if (Test-Path -LiteralPath $cleanupTarget) {
            Write-Host "Clearing $target"
            Remove-Item -LiteralPath $cleanupTarget -Recurse -Force
        }
    }
}

Push-Location $projectRoot
try {
    # Apply the config plugin even when android/ already exists. Expo run alone
    # skips prebuild in that case. Do not use --clean: preserve native files.
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Android configuration failed.' }
    & npx.cmd expo run:android
    $buildExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $buildExitCode
