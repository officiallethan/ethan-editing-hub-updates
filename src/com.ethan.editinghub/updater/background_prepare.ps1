param(
    [Parameter(Mandatory=$true)][string]$FeedUrl,
    [Parameter(Mandatory=$true)][string]$CurrentVersion,
    [Parameter(Mandatory=$true)][string]$ExtensionPath,
    [Parameter(Mandatory=$true)][string]$StateRoot,
    [Parameter(Mandatory=$true)][string]$JobId
)

$ErrorActionPreference = 'Stop'
$ExtensionId = 'com.ethan.editinghub'
$BackgroundDir = Join-Path $StateRoot 'background'
$StatusPath = Join-Path $BackgroundDir ($JobId + '.json')
$WorkDir = Join-Path $BackgroundDir ($JobId + '_work')
$FolderZip = Join-Path $WorkDir 'dropbox_folder.zip'
$PackageZip = Join-Path $WorkDir 'package.zip'
$StageDir = Join-Path $WorkDir 'stage'
$LogPath = Join-Path $StateRoot 'background_prepare.log'

New-Item -ItemType Directory -Force -Path $BackgroundDir | Out-Null
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

function Write-State {
    param([string]$State,[int]$Pct,[string]$Message,[string]$ErrorText='', [string]$BackupHint='')
    $obj = [ordered]@{ ok = ($State -ne 'error'); state=$State; pct=$Pct; message=$Message; error=$ErrorText; backupHint=$BackupHint; jobId=$JobId; updated=(Get-Date).ToString('o') }
    $json = $obj | ConvertTo-Json -Compress
    $tmp = $StatusPath + '.tmp'
    [System.IO.File]::WriteAllText($tmp,$json,(New-Object System.Text.UTF8Encoding($false)))
    Move-Item -LiteralPath $tmp -Destination $StatusPath -Force
}
function Log([string]$Text){ Add-Content -LiteralPath $LogPath -Value ((Get-Date).ToString('s')+' ['+$JobId+'] '+$Text) -Encoding UTF8 }
function Version-Newer([string]$A,[string]$B){
    $aa=@($A.Split('.') | ForEach-Object { $v=0; [void][int]::TryParse($_,[ref]$v); $v })
    $bb=@($B.Split('.') | ForEach-Object { $v=0; [void][int]::TryParse($_,[ref]$v); $v })
    $n=[Math]::Max($aa.Count,$bb.Count)
    for($i=0;$i -lt $n;$i++){ $x=if($i -lt $aa.Count){$aa[$i]}else{0}; $y=if($i -lt $bb.Count){$bb[$i]}else{0}; if($x -gt $y){return $true}; if($x -lt $y){return $false} }
    return $false
}
function Force-DropboxDownload([string]$Url){
    if($Url -match '([?&])dl=\d+') { return [regex]::Replace($Url,'([?&])dl=\d+','$1dl=1') }
    if($Url.Contains('?')){ return $Url + '&dl=1' }
    return $Url + '?dl=1'
}
function Read-ZipEntryText($Archive,[string]$BaseName){
    $entry = $Archive.Entries | Where-Object { $_.Name -ieq $BaseName } | Select-Object -First 1
    if(-not $entry){ throw "Dropbox OTA file is missing from the shared-folder ZIP: $BaseName" }
    $sr = New-Object System.IO.StreamReader($entry.Open(),[System.Text.Encoding]::UTF8,$true)
    try { return $sr.ReadToEnd() } finally { $sr.Dispose() }
}
function Get-Sha256([string]$Path){
    $sha=[System.Security.Cryptography.SHA256]::Create(); $stream=[System.IO.File]::OpenRead($Path)
    try { $bytes=$sha.ComputeHash($stream); return ([BitConverter]::ToString($bytes)).Replace('-','').ToUpperInvariant() } finally { $stream.Dispose(); $sha.Dispose() }
}
function Assert-SafeZip($Archive){
    foreach($entry in $Archive.Entries){
        $name=[string]$entry.FullName
        if([string]::IsNullOrWhiteSpace($name)){continue}
        if([System.IO.Path]::IsPathRooted($name) -or $name -match '(^|[\\/])\.\.([\\/]|$)'){ throw "Unsafe ZIP path rejected: $name" }
    }
}
function Find-Payload([string]$Root,[string]$Mode){
    $candidates=@(
        (Join-Path $Root 'payload\com.ethan.editinghub'),
        (Join-Path $Root 'com.ethan.editinghub'),
        $Root
    )
    foreach($c in $candidates){
        if(-not (Test-Path -LiteralPath $c -PathType Container)){continue}
        if($Mode -eq 'overlay'){
            $marker=Join-Path $c 'updater\overlay_release.json'
            if(Test-Path -LiteralPath $marker -PathType Leaf){
                $meta=Get-Content -LiteralPath $marker -Raw -Encoding UTF8 | ConvertFrom-Json
                if([string]$meta.extensionId -eq $ExtensionId){ return $c }
            }
        } else {
            if((Test-Path (Join-Path $c 'index.html')) -and (Test-Path (Join-Path $c 'CSXS\manifest.xml')) -and (Test-Path (Join-Path $c 'jsx\backend.jsx'))){ return $c }
        }
    }
    return $null
}
function Quote-Cmd([string]$s){ return '"' + ($s -replace '"','""') + '"' }

try {
    Write-State 'working' 8 'Downloading update manifest in background...'
    Log 'START background preparation'
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $CanonicalFeed = 'https://raw.githubusercontent.com/officiallethan/ethan-editing-hub-updates/refs/heads/main/latest.json'
    $isDropbox = ($FeedUrl -match '^https://(?:www\.)?dropbox\.com/scl/fo/')
    $isGitHub = ([string]::Equals($FeedUrl,$CanonicalFeed,[System.StringComparison]::OrdinalIgnoreCase))
    if(-not $isDropbox -and -not $isGitHub){ throw "Unsupported update feed. Use the canonical Ethan Hub GitHub feed or the legacy Dropbox recovery feed." }

    if($isGitHub){
        Write-State 'working' 20 'Reading the permanent GitHub release manifest...'
        $manifestPath = Join-Path $WorkDir 'latest.json'
        Invoke-WebRequest -Uri $CanonicalFeed -OutFile $manifestPath -UseBasicParsing
        if(-not (Test-Path -LiteralPath $manifestPath) -or (Get-Item $manifestPath).Length -lt 40){ throw 'GitHub latest.json download was empty or incomplete.' }
        $m = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if([string]$m.extensionId -ne $ExtensionId){ throw "Feed identity mismatch: $($m.extensionId)" }
        if(-not (Version-Newer ([string]$m.version) $CurrentVersion)){ throw "The feed does not contain a version newer than $CurrentVersion." }
        if(([string]$m.sha256 -replace '\s','').Length -ne 64){ throw 'Manifest SHA-256 is missing or invalid.' }
        $targetVersion=[string]$m.version
        $expected=([string]$m.sha256 -replace '\s','').ToUpperInvariant()
        $mode='full'
        $expectedPackage = 'https://github.com/officiallethan/ethan-editing-hub-updates/releases/download/v' + $targetVersion + '/EthanHub_Update_' + $targetVersion + '.zip'
        if([string]$m.packageUrl -ne $expectedPackage){ throw 'GitHub packageUrl is not the canonical immutable Ethan Hub release asset.' }
        Write-State 'working' 42 'Downloading the verified GitHub release package outside After Effects...'
        Invoke-WebRequest -Uri $expectedPackage -OutFile $PackageZip -UseBasicParsing
        if(-not (Test-Path -LiteralPath $PackageZip) -or (Get-Item $PackageZip).Length -lt 100){ throw 'GitHub release package download was empty or incomplete.' }
    }
    else {
        Write-State 'working' 14 'Downloading legacy Dropbox OTA folder in background...'
        $direct = Force-DropboxDownload $FeedUrl
        Invoke-WebRequest -Uri $direct -OutFile $FolderZip -UseBasicParsing
        if(-not (Test-Path -LiteralPath $FolderZip) -or (Get-Item $FolderZip).Length -lt 50){ throw 'Dropbox folder download was empty or incomplete.' }

        Write-State 'working' 28 'Reading the legacy Dropbox update manifest outside After Effects...'
        $archive=[System.IO.Compression.ZipFile]::OpenRead($FolderZip)
        try {
            $manifestText=Read-ZipEntryText $archive 'latest.json'
            $m=$manifestText | ConvertFrom-Json
            if([string]$m.extensionId -ne $ExtensionId){ throw "Feed identity mismatch: $($m.extensionId)" }
            if(-not (Version-Newer ([string]$m.version) $CurrentVersion)){ throw "The feed does not contain a version newer than $CurrentVersion." }
            if(([string]$m.sha256 -replace '\s','').Length -ne 64){ throw 'Manifest SHA-256 is missing or invalid.' }
            $mode=if([string]$m.packageMode -eq 'overlay'){'overlay'}else{'full'}
            $encoding=[string]$m.packageEncoding
            if($encoding -ne 'dropbox-folder-chunks'){ throw "Unsupported background package encoding: $encoding" }
            $parts=@($m.packageParts)
            if($parts.Count -lt 1){ throw 'Manifest packageParts is empty.' }

            Write-State 'working' 42 ("Assembling $($parts.Count) verified Dropbox package part(s)...")
            $builder=New-Object System.Text.StringBuilder
            foreach($part in $parts){
                $name=[string]$part
                if($name -notmatch '^[^\\/:*?"<>|]+$'){ throw "Unsafe package part filename: $name" }
                $txt=Read-ZipEntryText $archive $name
                [void]$builder.Append(($txt -replace '\s',''))
            }
            try { $bytes=[Convert]::FromBase64String($builder.ToString()) } catch { throw 'The Dropbox Base64 package could not be decoded.' }
            [System.IO.File]::WriteAllBytes($PackageZip,$bytes)
            $targetVersion=[string]$m.version
            $expected=([string]$m.sha256 -replace '\s','').ToUpperInvariant()
        } finally { $archive.Dispose() }
    }

    Write-State 'working' 62 'Verifying SHA-256 outside After Effects...'
    $actual=Get-Sha256 $PackageZip
    if($actual -ne $expected){ throw "SHA-256 verification failed. Expected $expected Actual $actual" }

    Write-State 'working' 74 'Extracting verified update outside After Effects...'
    if(Test-Path -LiteralPath $StageDir){ Remove-Item -LiteralPath $StageDir -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $StageDir | Out-Null
    $pkgArchive=[System.IO.Compression.ZipFile]::OpenRead($PackageZip)
    try { Assert-SafeZip $pkgArchive } finally { $pkgArchive.Dispose() }
    [System.IO.Compression.ZipFile]::ExtractToDirectory($PackageZip,$StageDir)
    $payload=Find-Payload $StageDir $mode
    if(-not $payload){ throw "Verified ZIP extracted, but Ethan Hub $mode payload files were not found." }
    if($mode -eq 'overlay'){
        $overlayMeta=Get-Content -LiteralPath (Join-Path $payload 'updater\overlay_release.json') -Raw -Encoding UTF8 | ConvertFrom-Json
        if([string]$overlayMeta.extensionId -ne $ExtensionId){ throw 'Overlay identity check failed.' }
        if([string]$overlayMeta.version -and [string]$overlayMeta.version -ne $targetVersion){ throw 'Overlay version marker does not match the feed.' }
    }

    Write-State 'working' 86 'Staging FreeFlow installer...'
    $backups=Join-Path $StateRoot 'backups'; New-Item -ItemType Directory -Force -Path $backups | Out-Null
    $stamp=[DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    $safeCurrent=($CurrentVersion -replace '[^0-9A-Za-z._-]','_')
    $backup=Join-Path $backups ($safeCurrent+'_'+$stamp)
    $installCmd=Join-Path $StateRoot 'INSTALL_PENDING_UPDATE.cmd'
    $freeflowLog=Join-Path $StateRoot 'freeflow_update.log'
    $copySwitch=if($mode -eq 'overlay'){'/E'}else{'/MIR'}
    $lines=@(
        '@echo off',
        'setlocal EnableExtensions EnableDelayedExpansion',
        'title Ethan Editing Hub Software Update',
        ('echo FREEFLOW_START '+$stamp),
        ('echo Update: '+$CurrentVersion+' to '+$targetVersion),
        ('echo Package mode: '+$mode),
        'set /a WAIT_COUNT=0',
        ':WAITAE',
        'tasklist /FI "IMAGENAME eq AfterFX.exe" 2>NUL | find /I "AfterFX.exe" >NUL',
        'if not errorlevel 1 (',
        '  set /a WAIT_COUNT+=1',
        '  if !WAIT_COUNT! GEQ 300 (echo FREEFLOW_TIMEOUT: AfterFX.exe remained open for 600 seconds.&exit /b 20)',
        '  timeout /t 2 /nobreak >NUL',
        '  goto WAITAE',
        ')',
        'echo Backing up current Hub...',
        ('if not exist '+(Quote-Cmd $backup)+' mkdir '+(Quote-Cmd $backup)),
        ('robocopy '+(Quote-Cmd $ExtensionPath)+' '+(Quote-Cmd $backup)+' /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS >NUL'),
        'set BACK_RC=!ERRORLEVEL!',
        'if !BACK_RC! GEQ 8 (echo FREEFLOW_BACKUP_FAILED: robocopy exit !BACK_RC!&exit /b 21)',
        'echo Installing verified update...',
        ('robocopy '+(Quote-Cmd $payload)+' '+(Quote-Cmd $ExtensionPath)+' '+$copySwitch+' /COPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS >NUL'),
        'set INSTALL_RC=!ERRORLEVEL!',
        'if !INSTALL_RC! GEQ 8 (echo FREEFLOW_INSTALL_FAILED: robocopy exit !INSTALL_RC!&exit /b 22)',
        ('echo '+$targetVersion+' > '+(Quote-Cmd (Join-Path $StateRoot 'last_installed_version.txt'))),
        ('echo FREEFLOW_COMPLETE: '+$targetVersion),
        ('echo Backup: '+$backup),
        'endlocal',
        'exit /b 0'
    )
    [System.IO.File]::WriteAllLines($installCmd,$lines,(New-Object System.Text.UTF8Encoding($false)))
    $arg='/d /c call '+(Quote-Cmd $installCmd)+' >> '+(Quote-Cmd $freeflowLog)+' 2>&1'
    Start-Process -FilePath $env:ComSpec -ArgumentList $arg -WindowStyle Hidden | Out-Null

    Write-State 'ready' 100 'Update verified and staged.' '' $backup
    Log ("READY target=$targetVersion sha=$actual")
} catch {
    $msg=$_.Exception.Message
    try { Write-State 'error' 0 'Background update preparation failed.' $msg '' } catch {}
    try { Log ('ERROR '+$msg) } catch {}
    exit 1
}
