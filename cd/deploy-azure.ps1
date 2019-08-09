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

"Importing publish profile generator..."
. "$PSScriptRoot\Write-PublishProfile.ps1"

$scriptBlock = @{
  dotnetcore = { 
@"
**
** running $buildType script block...
**
"@
    "Remove/Add nuget.org source..."
    nuget sources Remove -Name nuget.org
    nuget sources Add -Name nuget.org -Source "http://svdlknxtgapp02.servers.global.prv/artifactory/api/nuget/nuget-virtual"

    $pubxmlParams = @{
      workspace=$workspace
      buildName=$buildName
      deployLocation=$deployLocation
      publishTargetFramework='netcoreapp2.2'
      publishRuntime='win-x64'
    }

    Write-PublishProfile @pubxmlParams
    
    "Publishing..."
    dotnet publish .\$buildName\$buildName.csproj /p:Configuration=Release /p:PublishProfile="$workspace\$buildName\Properties\PublishProfiles\$buildName.pubxml" /p:Password=$deployPass /p:AllowUntrustedCertificate=True
  }
  other = { 
@"
**
** running $buildType script block...
**
"@
    $pubxmlParams = @{
      workspace=$workspace
      buildName=$buildName
      deployLocation=$deployLocation
      publishTargetFramework='net45'
      publishRuntime='win-x64'
    }

    Write-PublishProfile @pubxmlParams

    "Publishing..."
    dotnet publish .\$buildName\$buildName.csproj /p:Configuration=Release /p:PublishProfile="$workspace\$buildName\Properties\PublishProfiles\$buildName.pubxml" /p:Password=$deployPass /p:AllowUntrustedCertificate=True
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
