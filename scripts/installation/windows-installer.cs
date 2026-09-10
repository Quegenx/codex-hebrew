using System;
using System.IO;
using System.IO.Compression;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;

internal sealed class WindowsInstallerPayload {
 public string product { get;set; }
 public string packageVersion { get;set; }
 public string sourceArchiveSha256 { get;set; }
 public string outputArchiveSha256 { get;set; }
 public string runtimeSha256 { get;set; }
 public string deltaSha256 { get;set; }
 public Dictionary<string,string> files { get;set; }
}

internal static class WindowsInstaller {
 internal static byte[] ReadEntry(ZipArchive zip,string name){var entry=zip.GetEntry(name);if(entry==null)throw new InvalidDataException("Missing installer entry: "+name);using(var stream=entry.Open())using(var buffer=new MemoryStream()){stream.CopyTo(buffer);return buffer.ToArray();}}
 internal static WindowsInstallerPayload ReadPayload(){using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))using(var zip=new ZipArchive(stream,ZipArchiveMode.Read))return WindowsInstallPaths.ReadJson<WindowsInstallerPayload>(Encoding.UTF8.GetString(ReadEntry(zip,"installer.json")));}
 internal static string DetectSource(){
  string powershell=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"WindowsPowerShell","v1.0","powershell.exe");
  var start=new ProcessStartInfo(powershell,"-NoProfile -NonInteractive -Command \"[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-AppxPackage OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1).InstallLocation\"");
  start.UseShellExecute=false;start.CreateNoWindow=true;start.WindowStyle=ProcessWindowStyle.Hidden;start.RedirectStandardOutput=true;start.RedirectStandardError=true;start.StandardOutputEncoding=Encoding.UTF8;
  using(var process=Process.Start(start)){string value=process.StandardOutput.ReadToEnd().Trim();process.StandardError.ReadToEnd();process.WaitForExit();if(process.ExitCode==0&&value.Length>0){string exe=Path.Combine(value,"app","ChatGPT.exe");if(File.Exists(exe))return exe;}}
  return "";
 }
 internal static Dictionary<string,string> FindSharedData(){
  string home=Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),roaming=Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
  string codex=Path.Combine(home,".codex");
  foreach(string profile in new[]{Path.Combine(roaming,"Codex","web","Codex"),Path.Combine(roaming,"Codex")})
   if(Directory.Exists(codex)&&Directory.Exists(Path.Combine(profile,"Default")))return new Dictionary<string,string>{{"codexHome",codex},{"userDataPath",profile}};
  return null;
 }
 internal static void CheckSharedData(Dictionary<string,string> shared){
  if(shared==null)return;
  foreach(string key in new[]{"codexHome","userDataPath"})if(!shared.ContainsKey(key)||!Path.IsPathRooted(shared[key])||!Directory.Exists(shared[key]))throw new IOException("לא נמצאו תיקיות הנתונים המקוריות של Codex.");
 }
 internal static void CheckSource(string executable,WindowsInstallerPayload payload){
  if(!Environment.Is64BitProcess)throw new IOException("המתקין דורש Windows x64.");
  if(!File.Exists(executable)||!String.Equals(Path.GetFileName(executable),"ChatGPT.exe",StringComparison.OrdinalIgnoreCase))throw new IOException("יש לבחור את ChatGPT.exe מתוך התקנת Codex המקורית.");
  string archive=Path.Combine(Path.GetDirectoryName(executable),"resources","app.asar");
  if(!File.Exists(archive)||WindowsInstallPaths.HashFile(archive)!=payload.sourceArchiveSha256)throw new IOException("גרסת Codex המותקנת אינה תואמת למתקין הזה. הגרסה הנתמכת: "+payload.packageVersion+". ההתקנה הקיימת לא שונתה.");
 }
 internal static void CheckDestination(string source,string destination){
  if(WindowsInstallPaths.Same(source,destination)||WindowsInstallPaths.Inside(source,destination)||WindowsInstallPaths.Inside(destination,source))throw new IOException("Source and destination must be separate.");
  WindowsInstallPaths.NoLinks(destination);
  if(Directory.Exists(destination)){WindowsInstallPaths.RequireReceipt(destination);WindowsInstallPaths.CheckTree(destination);WindowsInstallPaths.RequireStopped(destination);}
 }
 internal static void CopyApplication(string source,string target){
  var start=new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"robocopy.exe"));
  start.Arguments=WindowsInstallPaths.Quote(source)+" "+WindowsInstallPaths.Quote(target)+" /E /COPY:DAT /DCOPY:DAT /R:0 /W:0 /XJ /NFL /NDL /NJH /NJS /NP";
  start.UseShellExecute=false;start.CreateNoWindow=true;start.WindowStyle=ProcessWindowStyle.Hidden;start.RedirectStandardOutput=true;start.RedirectStandardError=true;
  using(var process=Process.Start(start)){var output=process.StandardOutput.ReadToEndAsync();var errors=process.StandardError.ReadToEndAsync();process.WaitForExit();if(process.ExitCode>=8)throw new IOException("העתקת קובצי התוכנה נכשלה ("+process.ExitCode+"). "+output.Result+errors.Result);}
 }
 internal static void VerifyRuntime(string root,WindowsInstallerPayload payload){
  string runtime=Path.Combine(root,"app","resources","hebrew-runtime");
  var manifest=WindowsInstallPaths.ReadJson<Dictionary<string,object>>(File.ReadAllText(Path.Combine(runtime,"manifest.json")));
  var names=new List<string>();foreach(object value in (System.Collections.IEnumerable)manifest["files"])names.Add((string)value);names.Sort(StringComparer.Ordinal);
  using(var hash=SHA256.Create()){
   foreach(string name in names){if(Path.GetFileName(name)!=name)throw new InvalidDataException("Invalid runtime name");foreach(byte[] data in new[]{Encoding.UTF8.GetBytes(name),File.ReadAllBytes(Path.Combine(runtime,name))})hash.TransformBlock(data,0,data.Length,null,0);}
   hash.TransformFinalBlock(new byte[0],0,0);string actual=BitConverter.ToString(hash.Hash).Replace("-","").ToLowerInvariant();
   if(actual!=payload.runtimeSha256||(string)manifest["runtimeSha256"]!=actual||(string)manifest["sourceArchiveSha256"]!=payload.sourceArchiveSha256)throw new InvalidDataException("Hebrew runtime verification failed");
  }
 }
 internal static void ExtractPayload(ZipArchive zip,string stage,WindowsInstallerPayload payload){
  if(payload.product!="codex-hebrew-windows"||zip.Entries.Count!=payload.files.Count+2)throw new InvalidDataException("Invalid installer payload");
  var paths=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
  foreach(var pair in payload.files){
   string name=pair.Key;if(name.Contains("\\")||name.Contains(":")||name.StartsWith("/")||Array.Exists(name.Split('/'),part=>part==".."||part=="."||part.Length==0))throw new InvalidDataException("Invalid payload path");
   string target=Path.GetFullPath(Path.Combine(stage,name.Replace('/',Path.DirectorySeparatorChar)));
   if(!WindowsInstallPaths.Inside(stage,target)||!paths.Add(target))throw new InvalidDataException("Invalid payload destination");
   byte[] bytes=ReadEntry(zip,"files/"+name);if(WindowsInstallPaths.Hash(bytes)!=pair.Value)throw new InvalidDataException("Payload checksum mismatch: "+name);
   Directory.CreateDirectory(Path.GetDirectoryName(target));File.WriteAllBytes(target,bytes);
  }
 }
 internal static WindowsInstallReceipt Install(string executable,string destination,Dictionary<string,string> shared,Action<string> progress){
  executable=Path.GetFullPath(executable);destination=WindowsInstallPaths.Normalize(destination);var payload=ReadPayload();
  string source=Path.GetDirectoryName(executable),parent=Path.GetDirectoryName(destination);
  progress("בודק התאמה של Codex המותקן…");CheckSource(executable,payload);CheckDestination(source,destination);CheckSharedData(shared);
  Directory.CreateDirectory(parent);WindowsInstallPaths.NoLinks(parent);
  using(var installLock=new FileStream(destination+".install-lock",FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None,1,FileOptions.DeleteOnClose)){
   CheckDestination(source,destination);bool updating=Directory.Exists(destination);string stage=destination+".stage-"+Guid.NewGuid().ToString("N");Directory.CreateDirectory(stage);
   try{
    progress("מעתיק את קובצי התוכנה לעותק בעברית…");CopyApplication(source,Path.Combine(stage,"app"));WindowsInstallPaths.CheckTree(stage);
    string stagedArchive=Path.Combine(stage,"app","resources","app.asar");
    byte[] original=File.ReadAllBytes(stagedArchive);if(WindowsInstallPaths.Hash(original)!=payload.sourceArchiveSha256)throw new IOException("Codex השתנה במהלך ההתקנה. יש לנסות שוב.");
    using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))using(var zip=new ZipArchive(stream,ZipArchiveMode.Read)){
     progress("מתקין את העברית ואת תיקוני הפריסה…");byte[] delta=ReadEntry(zip,"app.asar.delta");if(WindowsInstallPaths.Hash(delta)!=payload.deltaSha256)throw new InvalidDataException("Delta checksum mismatch");
     byte[] patched=WindowsAsarPatch.Apply(original,delta);if(WindowsInstallPaths.Hash(patched)!=payload.outputArchiveSha256)throw new InvalidDataException("Application checksum mismatch");
     File.SetAttributes(stagedArchive,FileAttributes.Normal);File.WriteAllBytes(stagedArchive,patched);ExtractPayload(zip,stage,payload);
    }
    VerifyRuntime(stage,payload);
    string existingShared=Path.Combine(destination,"shared-data.json");
    if(File.Exists(existingShared))File.Copy(existingShared,Path.Combine(stage,"shared-data.json"));
    else if(!updating&&shared!=null)File.WriteAllText(Path.Combine(stage,"shared-data.json"),WindowsInstallPaths.Json(shared));
    var receipt=new WindowsInstallReceipt{root=destination,packageVersion=payload.packageVersion,sourceArchiveSha256=payload.sourceArchiveSha256,outputArchiveSha256=payload.outputArchiveSha256,runtimeSha256=payload.runtimeSha256};
    File.WriteAllText(Path.Combine(stage,WindowsInstallPaths.ReceiptName),WindowsInstallPaths.Json(receipt));
    progress("מסיים את ההתקנה…");CheckSource(executable,payload);WindowsInstallPaths.RequireStopped(destination);
    WindowsInstallPaths.CommitStage(stage,destination,()=>{if(WindowsInstallPaths.HashFile(Path.Combine(destination,"app","resources","app.asar"))!=payload.outputArchiveSha256)throw new IOException("Installed application verification failed");});
    return receipt;
   }finally{if(Directory.Exists(stage))WindowsInstallPaths.DeleteOwnedTree(parent,stage);}
  }
 }
}
