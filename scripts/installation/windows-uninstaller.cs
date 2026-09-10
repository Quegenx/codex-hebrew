using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

internal static class WindowsUninstaller {
 internal static void RemoveApplication(string root,bool integrate){
  WindowsInstallPaths.RequireReceipt(root);WindowsInstallPaths.NoLinks(root);WindowsInstallPaths.CheckTree(root);WindowsInstallPaths.RequireStopped(root);
  using(var installLock=new FileStream(root+".install-lock",FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None,1,FileOptions.DeleteOnClose)){
   WindowsInstallPaths.DeleteOwnedTree(Path.GetDirectoryName(root),root);if(integrate)WindowsInstallIntegration.Remove(root);
  }
 }
 [STAThread] public static int Main(string[] args){
  WindowsInstallPaths.EnableLongPaths();
  try{
   string root=WindowsInstallPaths.DefaultRoot;
   if(args.Length==2&&args[0]=="--worker"){
    int parent=int.Parse(args[1]);try{using(var process=Process.GetProcessById(parent))if(!process.WaitForExit(30000))throw new IOException("Uninstaller parent is still running");}catch(ArgumentException){}
    RemoveApplication(root,true);
    MessageBox.Show("Codex בעברית הוסר. השיחות, הפרויקטים וההגדרות נשמרו.","הסרת Codex בעברית");return 0;
   }
   if(args.Length!=0||!WindowsInstallPaths.Same(AppDomain.CurrentDomain.BaseDirectory,root))throw new IOException("Run the uninstaller from the installed Codex Hebrew folder.");
   WindowsInstallPaths.RequireReceipt(root);WindowsInstallPaths.RequireStopped(root);
   if(MessageBox.Show("להסיר את Codex בעברית?\nהשיחות, הפרויקטים וההגדרות יישמרו.","הסרת Codex בעברית",MessageBoxButtons.YesNo,MessageBoxIcon.Question,MessageBoxDefaultButton.Button2)!=DialogResult.Yes)return 0;
   // Run the small uninstaller outside the install tree so its executable can be removed.
   string temporary=Path.Combine(Path.GetTempPath(),"Codex-Hebrew-Uninstall-"+Guid.NewGuid().ToString("N")+".exe");File.Copy(Assembly.GetExecutingAssembly().Location,temporary);
   Process.Start(new ProcessStartInfo(temporary,"--worker "+Process.GetCurrentProcess().Id){UseShellExecute=false,CreateNoWindow=true});return 0;
  }catch(Exception error){MessageBox.Show(error.Message,"הסרת Codex בעברית",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
 }
}
