param(
  [string]$workspace=$env:WORKSPACE,
  [ValidateSet("dotnetcore","other", "vb6")]
  [string]$buildType,
  [string]$buildName,
  [string]$version
)

@"
Starting build.ps1...
**************************************************************
**************************************************************
**
** build script: build.ps1
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
"@
    "Remove/Add nuget.org source..."
    nuget sources Remove -Name nuget.org
    nuget sources Add -Name nuget.org -Source http://svdlknxtgapp02.servers.global.prv/artifactory/api/nuget/nuget-virtual
    
    "Building using Debug configuration.."
    dotnet publish --framework netcoreapp2.2 --configuration Debug --output "../Debug"
  }
  other = { 
@"
**
** running $buildType script block...
**
"@
    "Restoring..."
    # dotnet restore
    
    "Building..."
    # dotnet build 
  }
  vb6 = {
@"
**
** running $buildType script block...
**
"@
    "Adding VB6 Compiler to path..."
    $env:PATH+=";C:\Program Files (x86)\Microsoft Visual Studio\V98"

    "Compiling $($buildName).vbp"
    VB6 /make "$($buildName).vbp" /outdir .\release\

    $fileExists = $false

    $time = 30

    while (!($fileExists)) {
      "Waiting for .dll to compile - ($time seconds)"

      Start-Sleep -Seconds $time
      
      $fileExists = (Test-Path ".\release\$($buildName)_v$($version).dll" -PathType Leaf)
    }
  }
}

Invoke-Command $scriptBlock.$buildType 

"Finishing build.ps1..."
