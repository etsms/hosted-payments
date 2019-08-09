param(
  [string]$workspace=$env:WORKSPACE,
  [ValidateSet("dotnetcore","other", "vb6")]
  [string]$buildType,
  [string]$buildName,
  [string]$deployLocation,
  [string]$branch
)

@"
Starting release.ps1...
**************************************************************
**************************************************************
**
** release script: release.ps1 
**
**************************************************************
**************************************************************
**
** Navigating to workspace dir: $workspace
**
"@
Set-Location $workspace

$scriptBlock = @{
  dotnetcore = {
@"
**
** running $buildType script block...
**

"Building using Release configuration..."
"# dotnet publish --framework $framework --configuration Release --output '../Release'"

"Zipping Production files from here: $buildName\Release"
"To the destination: $buildName-v$version+$($env:BUILD_NUMBER).zip"

# Compress-Archive `
#   -Path ".\Release\*" `
#   -DestinationPath "$buildName-v$version+$($env:BUILD_NUMBER).zip"
"@

    "Triggering version bump job..."
    $url = "https://svdlknxtgapp03.servers.global.prv/jenkins/view/EMONEY/job/EMONEY-Version-Bump/buildWithParameters"
    $queryString = "token=20a78dbe-491f-414b-8549-815b681e5c66&version=$version&repo=$buildName&project=$buildKey&branch=$branch"

    "Setting security protocol TLS 1.2"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    "Invoking url $url`?$queryString"
    Invoke-WebRequest -URI "$url`?$queryString" -UseBasicParsing
  }
  other = {
@"
**
** running $projectType script block...
**
"@
  }
  vb6 = {
@"
**
** running $projectType script block...
**
"@
  }
}

Invoke-Command $scriptBlock.$projectType

"Finishing release.ps1..."
