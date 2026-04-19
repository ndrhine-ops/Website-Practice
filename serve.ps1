$port = 8080
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host ""
Write-Host "  Rhinehart Cabinetry - Local Server" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor DarkGray
Write-Host "  Serving: $root" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Open in browser: http://localhost:$port" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.json' = 'application/json'
}

while ($listener.IsListening) {
    $context  = $listener.GetContext()
    $request  = $context.Request
    $response = $context.Response

    $rawPath = $request.Url.LocalPath
    $filePath = Join-Path $root ($rawPath.TrimStart('/').Replace('/', '\'))

    if ((Test-Path $filePath -PathType Container) -or $rawPath -eq '/') {
        $filePath = Join-Path $root 'index.html'
    }

    try {
        $ext   = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime  = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)

        $response.ContentType     = $mime
        $response.ContentLength64 = $bytes.Length

        try {
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } finally {
            $response.OutputStream.Close()
        }

        Write-Host "  200  $rawPath" -ForegroundColor DarkGray
    } catch {
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
        $response.StatusCode      = 404
        $response.ContentType     = 'text/plain'
        $response.ContentLength64 = $body.Length

        try {
            $response.OutputStream.Write($body, 0, $body.Length)
        } finally {
            $response.OutputStream.Close()
        }

        Write-Host "  404  $rawPath" -ForegroundColor DarkYellow
    }
}
