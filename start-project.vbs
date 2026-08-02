' start-project.vbs
' Opens this project folder in VS Code.
' Auto-running "npm run tw" and "npm run dev" (via "npm run dev:all") happens
' through .vscode/tasks.json ("runOn": "folderOpen"), not from this script.

Option Explicit

Dim fso, shell, projectPath

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Run through cmd /c so the "code" launcher (a .cmd shim) resolves via PATH.
' Window style 0 = hidden; the shim exits as soon as VS Code has been launched.
shell.Run "cmd /c code """ & projectPath & """", 0, False
