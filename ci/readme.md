# Continuous Integration (CI)

This folder contains the required scripts to provide continuous integration for the current project.

## Project Specific CI Stuff

* hosted-payments.js is a `type: other` project: ...
* hosted-payments.js publishes unit test information here: ...
* hosted-payments.js publishes integration test information here: ...
* hosted-payments.js uploads fortify scans to here: ...
* hosted-payments.js gets its version number here: ...

## What's in here

Our current pipeline is running
 in [jenkins](https://svdlknxtgapp03.servers.global.prv/jenkins/)
 and when that ceases to be true, this file and
 all of the other affected files should be updated
 with the new system/build information.

Jenkins has a pipeline feature that utilizes a
 `Jenkinsfile` which contains all of the build/pipeline
 information. Below are the file/script explanations:

* Jenkinsfile
  * responsible for orchestrating all of the script files (this should do as little custom jenkins stuff as possible!)
* build.ps1
  * builds the project
* test.ps1
  * runs the unit tests for the current project (integration tests too?)
* archive.ps1
  * archives the build output
* fortify-scan.ps1
  * scans the project and uploads to fortify ssc

## Why

Most of our projects have migrated to/from **five** different
 build systems. The most painful part of migrating from build
 systems is the system-specific garbage that tends to be the
 'quick solution'. Keeping our CI/CD processes scripted and
 version controlled will give us a better handle on everything.
 Migrating will be easier and our deployments will be more adaptable.
