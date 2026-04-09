$b = 'http://localhost:8080/api'
$pass = 0; $fail = 0; $fails = @()

function T($name, $url, $method='GET', $body=$null) {
  try {
    $p = @{ Uri=$url; Method=$method; ContentType='application/json'; ErrorAction='Stop' }
    if($body){$p.Body=$body}
    $r = Invoke-RestMethod @p
    Write-Host "PASS $name" -Fore Green
    $script:pass++
    return $r
  } catch {
    Write-Host "FAIL $name -> $($_.Exception.Message)" -Fore Red
    $script:fail++
    $script:fails += "$name -> $($_.Exception.Message)"
    return $null
  }
}

Write-Host "=== GET Endpoints ===" -Fore Cyan
T 'dashboard/overview' "$b/dashboard/overview"
T 'logs/recent' "$b/logs/recent?limit=3"
T 'logs/by-level' "$b/logs/by-level"
T 'logs/filter?level=ERROR' "$b/logs/filter?level=ERROR&limit=3"
T 'logs/filter?level=INFO' "$b/logs/filter?level=INFO&limit=3"
T 'logs/filter?level=WARN' "$b/logs/filter?level=WARN&limit=3"
T 'logs/filter?level=DEBUG' "$b/logs/filter?level=DEBUG&limit=3"
T 'logs/filter?sort=asc' "$b/logs/filter?limit=3&sort=asc"
T 'applications' "$b/applications"
T 'servers' "$b/servers"
T 'alerts' "$b/alerts"
T 'alerts/all' "$b/alerts/all"
T 'analytics/performance' "$b/analytics/performance"

Write-Host "`n=== CRUD App ===" -Fore Cyan
$app = T 'POST app' "$b/applications" POST '{"app_name":"_TEST_DEL","version":"1.0","status":"active","environment":"test"}'
if($app -and $app._id) {
  T 'PUT app' "$b/applications/$($app._id)" PUT '{"version":"2.0"}'
  T 'DELETE app' "$b/applications/$($app._id)" DELETE
}

Write-Host "`n=== CRUD Server ===" -Fore Cyan
$srv = T 'POST server' "$b/servers" POST '{"hostname":"_test-del.com","ip_address":"10.0.0.99","status":"active","environment":"test"}'
if($srv -and $srv._id) {
  T 'PUT server' "$b/servers/$($srv._id)" PUT '{"status":"inactive"}'
  T 'DELETE server' "$b/servers/$($srv._id)" DELETE
}

Write-Host "`n=== CRUD Alert ===" -Fore Cyan
$alt = T 'POST alert' "$b/alerts" POST '{"alert_id":"ALT-TEST-DEL","severity":"LOW","status":"ACTIVE","message":"Test alert delete me"}'
if($alt -and $alt._id) {
  T 'PUT alert' "$b/alerts/$($alt._id)" PUT '{"status":"ACKNOWLEDGED"}'
  T 'DELETE alert' "$b/alerts/$($alt._id)" DELETE
}

Write-Host "`n=== Log Generate ===" -Fore Cyan
T 'POST logs/generate' "$b/logs/generate" POST '{"count":2}'

Write-Host "`n=== Triggers ===" -Fore Cyan
T 'trigger:error_hotspot' "$b/triggers/execute" POST '{"triggerType":"error_hotspot_analysis","params":{"hours":"48"}}'
T 'trigger:cascade_sync' "$b/triggers/execute" POST '{"triggerType":"cascade_status_sync"}'
T 'trigger:health_report' "$b/triggers/execute" POST '{"triggerType":"service_health_report","params":{"hours":"24"}}'
T 'trigger:retention_cleanup' "$b/triggers/execute" POST '{"triggerType":"data_retention_cleanup","params":{"logDays":"30","alertDays":"7"}}'
T 'trigger:unknown(should fail gracefully)' "$b/triggers/execute" POST '{"triggerType":"nonexistent"}'

Write-Host "`n=== Console ===" -Fore Cyan
T 'POST mongodb/execute' "$b/mongodb/execute" POST '{"command":"db.log_entries.countDocuments({})"}'

Write-Host "`n=== Frontend Proxy ===" -Fore Cyan
T 'frontend proxy' 'http://localhost:5173/api/dashboard/overview'

Write-Host "`n========================================" -Fore Cyan
Write-Host "TOTAL: $pass PASS, $fail FAIL" -Fore $(if($fail -gt 0){'Red'}else{'Green'})
if($fails.Count -gt 0) {
  Write-Host "`nFailures:" -Fore Red
  $fails | ForEach-Object { Write-Host "  $_" -Fore Red }
}
