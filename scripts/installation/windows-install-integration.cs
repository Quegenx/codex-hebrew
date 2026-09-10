using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32;

internal static class WindowsInstallIntegration {
 internal const string RegistryPath="Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CodexHebrew";
 internal static string[] ShortcutPaths { get{return new[]{Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"Codex Hebrew.lnk"),Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"Codex Hebrew.lnk")};} }
 internal static void WriteShortcut(string shortcut,string root){
  Directory.CreateDirectory(Path.GetDirectoryName(shortcut));string launcher=Path.Combine(root,"Codex Hebrew.exe");
  dynamic shell=Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));dynamic link=null;
  try{
   if(File.Exists(shortcut)){link=shell.CreateShortcut(shortcut);if(!WindowsInstallPaths.Same((string)link.TargetPath,launcher))throw new IOException("כבר קיים קיצור דרך בשם Codex Hebrew שמפנה למיקום אחר: "+shortcut);Marshal.FinalReleaseComObject(link);link=null;}
   // Reuse the original Codex property store, including its AppUserModelID.
   string template=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"Codex.lnk");
   if(!File.Exists(shortcut)&&File.Exists(template))File.Copy(template,shortcut);
   link=shell.CreateShortcut(shortcut);link.TargetPath=launcher;link.WorkingDirectory=root;link.Arguments="";link.IconLocation=launcher+",0";link.Description="Codex בעברית";link.Save();
  }finally{if(link!=null)Marshal.FinalReleaseComObject(link);Marshal.FinalReleaseComObject(shell);}
 }
 internal static void Register(string root,string version){
  foreach(string shortcut in ShortcutPaths)WriteShortcut(shortcut,root);
  using(var key=Registry.CurrentUser.CreateSubKey(RegistryPath)){
   key.SetValue("DisplayName","Codex Hebrew");key.SetValue("DisplayVersion",version+" Hebrew preview");key.SetValue("Publisher","Codex Hebrew community project");
   key.SetValue("InstallLocation",root);key.SetValue("DisplayIcon",Path.Combine(root,"Codex Hebrew.exe")+",0");key.SetValue("UninstallString",WindowsInstallPaths.Quote(Path.Combine(root,"Uninstall.exe")));
   key.SetValue("NoModify",1,RegistryValueKind.DWord);key.SetValue("NoRepair",1,RegistryValueKind.DWord);
  }
 }
 internal static void Remove(string root){
  dynamic shell=Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
  try{foreach(string path in ShortcutPaths)if(File.Exists(path)){dynamic link=shell.CreateShortcut(path);try{if(WindowsInstallPaths.Same((string)link.TargetPath,Path.Combine(root,"Codex Hebrew.exe")))File.Delete(path);}finally{Marshal.FinalReleaseComObject(link);}}}finally{Marshal.FinalReleaseComObject(shell);}
  using(var key=Registry.CurrentUser.OpenSubKey(RegistryPath)){if(key!=null&&key.GetValue("InstallLocation") is string&&WindowsInstallPaths.Same((string)key.GetValue("InstallLocation"),root))Registry.CurrentUser.DeleteSubKeyTree(RegistryPath,false);}
 }
}
