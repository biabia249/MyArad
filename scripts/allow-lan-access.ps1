[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)][string]$LocalAddress,
    [ValidateSet('Private', 'Public', 'Domain')][string]$Profile = 'Private',
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'

# Run on the hosting laptop. This never disables the firewall or opens Internet access.
$address = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $LocalAddress -ErrorAction SilentlyContinue
if (-not $address) { throw "This computer does not own $LocalAddress. Run this script on the hosting laptop." }
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$ruleName = 'MyArad-Development-LAN-TCP'
$rule = @{
    Name = $ruleName
    DisplayName = 'MyArad development - local subnet only'
    Direction = 'Inbound'
    Action = 'Allow'
    Protocol = 'TCP'
    LocalPort = @('3001', '8081')
    LocalAddress = $LocalAddress
    RemoteAddress = 'LocalSubnet'
    Profile = $Profile
    Program = $nodePath
    Enabled = 'True'
}
if (-not $Apply) {
    Write-Output "Planned rule: TCP 3001/8081; address $LocalAddress; remote LocalSubnet; profile $Profile; program $nodePath."
    Write-Output 'To apply it, rerun in an Administrator PowerShell with -Apply. Keep Windows Firewall enabled.'
    return
}
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Applying the rule requires an Administrator PowerShell.' }
if ($PSCmdlet.ShouldProcess("$LocalAddress TCP 3001/8081 on $Profile networks", 'Allow Node.js traffic from the local subnet')) {
    if (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue) {
        $rule.Remove('DisplayName')
        Set-NetFirewallRule @rule | Out-Null
    } else { New-NetFirewallRule @rule | Out-Null }
    Write-Output 'MyArad LAN rule applied. The firewall remains enabled.'
}
