param(
  [Parameter(Mandatory = $true)][ValidateSet("capture", "click")][string]$Action,
  [Parameter(Mandatory = $true)][int]$ProcessId,
  [string]$OutPath,
  [string]$CropPath,
  [double]$ClientX = 0,
  [double]$ClientY = 0,
  [ValidateSet("left", "right")][string]$Button = "left",
  [double]$ScreenW = 0,
  [double]$ScreenH = 0
)

Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PobWindow {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT point);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int data, int extra);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint attach, uint attachTo, bool attachState);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  public struct POINT { public int X; public int Y; }
}
"@

[PobWindow]::SetProcessDPIAware() | Out-Null

$process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
if (-not $process) {
  throw "Process $ProcessId is not running."
}
$hwnd = [IntPtr]::Zero
for ($attempt = 0; $attempt -lt 40; $attempt++) {
  $process.Refresh()
  if ($process.MainWindowHandle -ne [IntPtr]::Zero) {
    $hwnd = $process.MainWindowHandle
    break
  }
  Start-Sleep -Milliseconds 250
}
if ($hwnd -eq [IntPtr]::Zero) {
  throw "Process $ProcessId has no main window."
}

$topmost = [IntPtr](-1)
$notTopmost = [IntPtr](-2)
$flags = 0x0001 -bor 0x0002
[PobWindow]::ShowWindow($hwnd, 9) | Out-Null
[PobWindow]::SetWindowPos($hwnd, $topmost, 0, 0, 0, 0, $flags) | Out-Null
$foreground = [PobWindow]::GetForegroundWindow()
$foregroundProcess = [uint32]0
$foregroundThread = [PobWindow]::GetWindowThreadProcessId($foreground, [ref]$foregroundProcess)
$currentThread = [PobWindow]::GetCurrentThreadId()
[PobWindow]::AttachThreadInput($currentThread, $foregroundThread, $true) | Out-Null
[PobWindow]::SetForegroundWindow($hwnd) | Out-Null
[PobWindow]::AttachThreadInput($currentThread, $foregroundThread, $false) | Out-Null
Start-Sleep -Milliseconds 400

if ($Action -eq "capture") {
  $rect = New-Object PobWindow+RECT
  [PobWindow]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  if ($width -lt 50 -or $height -lt 50) {
    throw "Window is too small to capture ($width x $height)."
  }
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $graphics.Dispose()
  $bitmap.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $cropWidth = [Math]::Min(420, $width)
  $crop = $bitmap.Clone(
    (New-Object System.Drawing.Rectangle 0, 0, $cropWidth, $height),
    $bitmap.PixelFormat
  )
  $scaled = New-Object System.Drawing.Bitmap ($crop.Width * 2), ($crop.Height * 2)
  $scaleGraphics = [System.Drawing.Graphics]::FromImage($scaled)
  $scaleGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $scaleGraphics.DrawImage($crop, 0, 0, $scaled.Width, $scaled.Height)
  $scaleGraphics.Dispose()
  $scaled.Save($CropPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $scaled.Dispose()
  $crop.Dispose()
  $bitmap.Dispose()
  Write-Output ("captured {0}x{1}" -f $width, $height)
}

if ($Action -eq "click") {
  $client = New-Object PobWindow+RECT
  [PobWindow]::GetClientRect($hwnd, [ref]$client) | Out-Null
  $targetX = $ClientX
  $targetY = $ClientY
  if ($ScreenW -gt 0 -and $client.Right -gt 0) {
    $targetX = $ClientX * $client.Right / $ScreenW
  }
  if ($ScreenH -gt 0 -and $client.Bottom -gt 0) {
    $targetY = $ClientY * $client.Bottom / $ScreenH
  }
  $point = New-Object PobWindow+POINT
  $point.X = [int][Math]::Round($targetX)
  $point.Y = [int][Math]::Round($targetY)
  [PobWindow]::ClientToScreen($hwnd, [ref]$point) | Out-Null
  [PobWindow]::SetCursorPos($point.X, $point.Y) | Out-Null
  Start-Sleep -Milliseconds 700
  if ($Button -eq "right") {
    [PobWindow]::mouse_event(0x0008, 0, 0, 0, 0)
    [PobWindow]::mouse_event(0x0010, 0, 0, 0, 0)
  } else {
    [PobWindow]::mouse_event(0x0002, 0, 0, 0, 0)
    [PobWindow]::mouse_event(0x0004, 0, 0, 0, 0)
  }
  Write-Output ("clicked {0} client {1},{2} scaled {3},{4} screen {5},{6} clientSize {7}x{8}" -f $Button, $ClientX, $ClientY, $targetX, $targetY, $point.X, $point.Y, $client.Right, $client.Bottom)
}

[PobWindow]::SetWindowPos($hwnd, $notTopmost, 0, 0, 0, 0, $flags) | Out-Null
