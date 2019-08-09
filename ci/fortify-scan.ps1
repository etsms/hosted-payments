param(
  [string]$workspace,#jenkins variable for workspace location
  [ValidateSet("dotnetcore","other", "vb6")]
  [string]$buildType,
  [string]$buildId="hosted-payments.jsDEV",
  [string]$repo="hosted-payments.js",
  [string]$scan="cloud",#choose 'cloud' (RECCOMENDED) for scanning in the cloud, 'local' for scanning on the Jenkins server
  [string]$appName="EMONEY_SUITE",#Application Name in SSC
  [string]$appVersion="EMONEY_SUITE.hp_js.ALL",#Application version in SSC
  [string]$FortifyURL="https://fortifyssc.us.bank-dns.com/ssc",
  [string]$FortifyTOKEN="af4a77f4-e4be-4beb-a986-6378eb71846b",#token generated in Adminsitration tab of Fortify SSC dashboard
  [string]$fortifyBuildType="{{NEEDS SPECIFICATION}}",#choose from 'MSBuild', 'Default', or 'SQL' (what else can go here)
  [string]$filesToScan="$repo\**\*"#default scans all files in the repo
)

@"
Starting fortify-scan.ps1...
**************************************************************
**************************************************************
**
** scan script: fortify-scan.ps1
**
**************************************************************
**************************************************************
**
** Navigating to workspace dir: $workspace
**
"@
Set-Location $workspace

#setting Enviornment variable PATH for MSBuild.exe
"$env:UserName"
if ($env:UserName -eq "jenkins") { 
  $msBuildPath=";C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\MSBuild\15.0\Bin" 
} 
else {
  $msBuildPath=";C:\Program Files (x86)\Microsoft Visual Studio\2019\Enterprise\MSBuild\Current\Bin"
}

$env:PATH += $msBuildPath
#set paths to any other compilers needed

#error checking for variable names
if (!($fortifyBuildType -eq "MSBuild" -Or $fortifyBuildType -eq "Default" -Or $fortifyBuildType -eq "SQL"))
{
  "Error: buildType variable needs to be 'MSBuild', 'Default', or 'SQL'"
  "buildType currently is $fortifyBuildType"
  return
}

if (!($scan -eq "cloud" -Or $scan -eq "local"))
{
  "Error: scan variable needs to be 'local' or 'scan'"
  "scan currently is $scan"
  return
}

### Fortify steps probably won't change ###

#Build cleaning and translation based on the type of project
if ($fortifyBuildType -eq "Default") { # this scans all files in the repo with no building
  "Initating clean and translation of a Default build..."
  sourceanalyzer -b $buildId -clean
  sourceanalyzer -b $buildId $filesToScan
  sourceanalyzer -b $buildId -show-files
}

if ($fortifyBuildType -eq "MSBuild") { # compiles the project using MSBuild before the scan
  "Initating clean and translation using MSBuild..."
  sourceanalyzer -b $buildId -clean
  "Running Windows build integration..."
  sourceanalyzer -b $buildId MSBuild $repo.sln /property:"Configuration=Debug" #expects repo.sln at the root of the project
}


if ($fortifyBuildType -eq "SQL"){ # default SQL translation from Fortify
  "Initating clean and translation of an SQL build..."
  sourceanalyzer -b $buildId -clean
  sourceanalyzer -b $buildId -Dcom.fortify.sca.fileextensions.sql=TSQL *.sql
  sourceanalyzer -b $buildId -show-files
}


# Scanning portion
if ($scan -eq "cloud"){
  "Initating CloudScan on the Fortify SSC Server..."
  cloudscan -sscurl $FortifyURL -ssctoken $FortifyToken start -upload -uptoken $FortifyToken -application $appName -application-version $appVersion -b $buildID -scan
}

if ($scan -eq "local"){
  "Scanning locally..."
  sourceanalyzer -b $buildId -scan -f "..\$repo\Fortify$buildId.fpr" #expects Fortifyproject-name.fpr at the root of the project
  "Uploading to Fortify SSC Server"
  fortifyclient -url $FortifyURL -authtoken $FortifyToken uploadFPR -file "..\$repo\Fortify$buildId.fpr" -project $appName -version $appVersion
}

"Finishing fortify-scan.ps1..."
