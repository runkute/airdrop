; NSIS custom installer actions for AI Marketing OS
; This file is included by electron-builder during Windows installer creation

!macro customInstall
  ; Add firewall exception for the backend service
  ; (silently fails if user doesn't have admin rights)
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="AI Marketing OS Backend" dir=in action=allow protocol=TCP localport=8765 profile=private'
!macroend

!macro customUnInstall
  ; Remove firewall exception on uninstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="AI Marketing OS Backend"'
!macroend
