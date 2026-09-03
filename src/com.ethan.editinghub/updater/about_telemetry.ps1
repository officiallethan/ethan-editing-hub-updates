param(
    [Parameter(Mandatory=$true)][string]$StateDir
)
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
$snapshot = Join-Path $StateDir 'snapshot.json'
$heartbeat = Join-Path $StateDir 'heartbeat.txt'
$lockPath = Join-Path $StateDir 'worker.lock'
$lock = $null
try {
    $lock = [System.IO.File]::Open($lockPath,[System.IO.FileMode]::OpenOrCreate,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::None)
} catch { exit 0 }
try {
    $logical = [Math]::Max(1,[Environment]::ProcessorCount)
    $lastCpu = $null
    $lastAt = $null
    while ($true) {
        if (-not (Test-Path -LiteralPath $heartbeat)) { break }
        $hb = Get-Item -LiteralPath $heartbeat -ErrorAction SilentlyContinue
        if (-not $hb -or ((Get-Date) - $hb.LastWriteTime).TotalSeconds -gt 8) { break }
        $p = Get-Process -Name AfterFX -ErrorAction SilentlyContinue | Sort-Object WorkingSet64 -Descending | Select-Object -First 1
        if (-not $p) { break }
        $now = Get-Date
        $cpuTotal = $p.TotalProcessorTime.TotalMilliseconds
        $cpuPct = -1.0
        if ($lastCpu -ne $null -and $lastAt -ne $null) {
            $elapsed = ($now - $lastAt).TotalMilliseconds
            if ($elapsed -gt 0) { $cpuPct = [Math]::Min(100,[Math]::Max(0,(($cpuTotal-$lastCpu)/$elapsed/$logical)*100)) }
        }
        $lastCpu = $cpuTotal; $lastAt = $now
        $memMB = [Math]::Round($p.WorkingSet64/1MB,1)
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
        $totalMB = if($os){[double]$os.TotalVisibleMemorySize/1024}else{-1}
        $freeMB = if($os){[double]$os.FreePhysicalMemory/1024}else{-1}
        $systemPct = if($totalMB -gt 0){[Math]::Min(100,[Math]::Max(0,(($totalMB-$freeMB)/$totalMB)*100))}else{-1}
        $memPct = if($totalMB -gt 0){[Math]::Min(100,[Math]::Max(0,($memMB/$totalMB)*100))}else{-1}
        $gpuPct = -1.0
        try {
            $needle = 'pid_' + $p.Id + '_'
            $gpu = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop |
                Where-Object { $_.Name -like ('*'+$needle+'*') -and ($_.Name -match 'engtype_3D|engtype_Compute|engtype_Copy|engtype_Video') } |
                Measure-Object -Property UtilizationPercentage -Sum
            if($gpu.Count -gt 0){$gpuPct=[Math]::Min(100,[Math]::Max(0,[double]$gpu.Sum))}
        } catch { $gpuPct = -1.0 }
        $data = [ordered]@{
            ok=$true; pid=$p.Id; cpuPercent=[Math]::Round($cpuPct,1); gpuPercent=[Math]::Round($gpuPct,1);
            memoryMB=$memMB; memoryPercent=[Math]::Round($memPct,1); systemMemoryPercent=[Math]::Round($systemPct,1);
            timestamp=$now.ToString('HH:mm:ss')
        }
        $tmp = $snapshot + '.tmp'
        $json = $data | ConvertTo-Json -Compress
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tmp, $json, $utf8NoBom)
        Move-Item -LiteralPath $tmp -Destination $snapshot -Force
        Start-Sleep -Milliseconds 1500
    }
} finally {
    if($lock){$lock.Dispose()}
    Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
}
