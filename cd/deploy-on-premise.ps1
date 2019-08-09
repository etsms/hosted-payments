param(
  [string]$workspace=$env:WORKSPACE,
  [ValidateSet("dotnetcore","other", "vb6")]
  [string]$buildType,
  [ValidateSet("dev","stg", "prd")]
  [string]$environment,
  [string]$buildName,
  [string]$deployLocation,
  [string]$deployType,
  [string]$deployUser='not initialized...',
  [string]$deployPass='not initialized...'
)

@"
Starting $environment deploy.ps1...
**************************************************************
**************************************************************
**
** deploy $deployType script: deploy.ps1 -- $environment
**
**************************************************************
**************************************************************
**
** Navigating to workspace dir: $workspace
**
"@
Set-Location $workspace

if (!$deployLocation) {
  "No deploy location found, exiting script..."
  return
}

"Importing configuration values..."
$endpoints = Get-Content "$PSScriptRoot\config\$deployType-dev.json" | ConvertFrom-Json

"Endpoints: $endpoints..."

$scriptBlock = @{
  dotnetcore = { 
@"
**
** running $buildType script block...
**
"@
    "Remove/Add nuget.org source..."
    # nuget sources Remove -Name nuget.org
    # nuget sources Add -Name nuget.org -Source "http://svdlknxtgapp02.servers.global.prv/artifactory/api/nuget/nuget-virtual"
  }
  other = { 
@"
**
** running $buildType script block...
**
"@
  }
  vb6 = {
@"
**
** running $buildType script block...
**
"@
  }
}

Invoke-Command $scriptBlock.$buildType 

"Finishing deploy.ps1..."
