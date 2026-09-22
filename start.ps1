$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw 'Create the local environment first: py -3.12 -m venv .venv; then install backend/requirements.txt.'
}
& $pythonPath (Join-Path $projectRoot 'scripts\start.py')
