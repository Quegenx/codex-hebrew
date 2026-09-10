using System;
using System.IO;
using System.IO.Compression;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;

internal static class WindowsInstallerChecks {
 static void Require(bool condition,string message){if(!condition)throw new Exception(message);}
 static void Reject(Action action,string message){try{action();}catch{return;}throw new Exception(message);}
 static void FileWith(string root,string name,string text){root=WindowsInstallPaths.Extended(root);Directory.CreateDirectory(root);File.WriteAllText(Path.Combine(root,name),text);}
 public static int Main(string[] args){
  WindowsInstallPaths.EnableLongPaths();
  try{
   string root=Path.GetFullPath(args[0]);if(Directory.Exists(root))throw new Exception("Use a new fixture directory");Directory.CreateDirectory(root);
   string deep=Path.Combine(root,"deep paths",new string('x',100),new string('y',100),new string('z',100));FileWith(deep,"test.txt","long path");WindowsInstallPaths.DeleteOwnedTree(root,Path.Combine(root,"deep paths"));Require(!Directory.Exists(Path.Combine(root,"deep paths")),"Long path cleanup failed");
   // The patch reconstructs the new bytes exactly and rejects corrupt data.
   byte[] original=Encoding.UTF8.GetBytes(new string('a',4096)+"שלום"),target=Encoding.UTF8.GetBytes(new string('a',4096)+"Windows עברית");
   byte[] patch=WindowsDelta.Transform(original,target,true);Require(WindowsInstallPaths.Hash(target)==WindowsInstallPaths.Hash(WindowsDelta.Transform(original,patch,false)),"Delta roundtrip");Reject(()=>WindowsDelta.Transform(original,new byte[]{1,2,3},false),"Corrupt delta accepted");
   using(var encoded=new MemoryStream()){
    using(var writer=new BinaryWriter(encoded,Encoding.UTF8,true)){writer.Write(0x31444843);writer.Write(target.Length);writer.Write(1);writer.Write((byte)1);writer.Write((long)0);writer.Write(original.Length);writer.Write(target.Length);writer.Write(patch.Length);writer.Write(patch);}
    byte[] container=encoded.ToArray();Require(WindowsInstallPaths.Hash(WindowsAsarPatch.Apply(original,container))==WindowsInstallPaths.Hash(target),"ASAR chunk reconstruction");
    container[13]=255;Reject(()=>WindowsAsarPatch.Apply(original,container),"ASAR source boundary accepted");
   }
   string source=Path.Combine(root,"source"),destination=Path.Combine(root,"installed app"),stage=Path.Combine(root,"stage"),profile=Path.Combine(root,"profile");
   FileWith(source,"ChatGPT.exe","fixture");FileWith(Path.Combine(source,"resources"),"app.asar","original");FileWith(profile,"conversation.txt","keep me");
   Reject(()=>WindowsInstaller.CheckSource(Path.Combine(source,"ChatGPT.exe"),new WindowsInstallerPayload{sourceArchiveSha256="wrong",packageVersion="test"}),"Wrong source accepted");
   // Refuse unrelated destinations, overlapping paths, and profiles inside an app tree.
   FileWith(destination,"unrelated.txt","keep me");Reject(()=>WindowsInstaller.CheckDestination(source,destination),"Unmanaged folder accepted");
   Reject(()=>WindowsInstaller.CheckDestination(source,Path.Combine(source,"child")),"Overlapping source accepted");
   File.WriteAllText(Path.Combine(destination,WindowsInstallPaths.ReceiptName),WindowsInstallPaths.Json(new WindowsInstallReceipt{root=destination}));
   File.WriteAllText(Path.Combine(destination,"shared-data.json"),WindowsInstallPaths.Json(new Dictionary<string,string>{{"codexHome",Path.Combine(destination,"data")},{"userDataPath",profile}}));
   Reject(()=>WindowsInstallPaths.RequireReceipt(destination),"Nested profile accepted");File.Delete(Path.Combine(destination,"shared-data.json"));
   // A failed commit restores the previous application and keeps external data.
   FileWith(stage,"version.txt","new");Reject(()=>WindowsInstallPaths.CommitStage(stage,destination,()=>{throw new IOException("verification failed");}),"Verification failure ignored");
   Require(File.ReadAllText(Path.Combine(destination,"unrelated.txt"))=="keep me","Previous install not restored");Require(File.ReadAllText(Path.Combine(profile,"conversation.txt"))=="keep me","Profile changed");
   FileWith(stage,"version.txt","new");WindowsInstallPaths.CommitStage(stage,destination,()=>Require(File.Exists(Path.Combine(destination,"version.txt")),"Missing install"));Require(!Directory.Exists(destination+".previous"),"Backup not cleaned");
   // Recovery backups are retained until the user explicitly resolves them.
   FileWith(destination+".previous","version.txt","recover");FileWith(stage,"version.txt","next");Reject(()=>WindowsInstallPaths.CommitStage(stage,destination,()=>{}),"Recovery backup overwritten");Require(File.ReadAllText(Path.Combine(destination+".previous","version.txt"))=="recover","Backup changed");
   // ZIP entries are bounded by the staging root, before any file is written.
   using(var bytes=new MemoryStream()){
    using(var zip=new ZipArchive(bytes,ZipArchiveMode.Create,true)){foreach(string name in new[]{"installer.json","app.asar.delta","files/../escape.txt"})using(var writer=new StreamWriter(zip.CreateEntry(name).Open()))writer.Write("x");}
    bytes.Position=0;using(var zip=new ZipArchive(bytes,ZipArchiveMode.Read))Reject(()=>WindowsInstaller.ExtractPayload(zip,stage,new WindowsInstallerPayload{product="codex-hebrew-windows",files=new Dictionary<string,string>{{"../escape.txt","bad"}}}),"ZIP traversal accepted");
   }
   // Shell integration only touches this fixture shortcut.
   string shortcut=Path.Combine(root,"shortcuts","Codex Hebrew.lnk");WindowsInstallIntegration.WriteShortcut(shortcut,destination);WindowsInstallIntegration.WriteShortcut(shortcut,destination);
   dynamic shell=Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));dynamic link=shell.CreateShortcut(shortcut);
   try{Require(WindowsInstallPaths.Same((string)link.TargetPath,Path.Combine(destination,"Codex Hebrew.exe")),"Shortcut target");Require(((string)link.IconLocation).StartsWith(Path.Combine(destination,"Codex Hebrew.exe")),"Shortcut icon");}finally{Marshal.FinalReleaseComObject(link);Marshal.FinalReleaseComObject(shell);}
   Require(File.ReadAllText(Path.Combine(profile,"conversation.txt"))=="keep me","Profile changed after checks");
   File.WriteAllText(Path.Combine(destination,WindowsInstallPaths.ReceiptName),WindowsInstallPaths.Json(new WindowsInstallReceipt{root=destination}));
   WindowsUninstaller.RemoveApplication(destination,false);Require(!Directory.Exists(destination),"Uninstall left application");Require(File.ReadAllText(Path.Combine(profile,"conversation.txt"))=="keep me","Uninstall changed profile");
   Console.WriteLine("Windows installer checks passed: delta, source guard, paths, rollback, recovery, profile preservation, ZIP boundary, shortcuts, uninstall.");return 0;
  }catch(Exception error){Console.Error.WriteLine(error);return 1;}
 }
}
