using System;
using System.IO;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
using System.Diagnostics;

[assembly: System.Runtime.Versioning.TargetFramework(".NETFramework,Version=v4.8")]

internal sealed class WindowsInstallReceipt {
 public string product="codex-hebrew-windows";
 public string sourceArchiveSha256;
 public string outputArchiveSha256;
 public string runtimeSha256;
 public string packageVersion;
 public string root;
}

internal static class WindowsInstallPaths {
 internal static void EnableLongPaths(){AppContext.SetSwitch("Switch.System.IO.UseLegacyPathHandling",false);AppContext.SetSwitch("Switch.System.IO.BlockLongPaths",false);}
 internal const string ReceiptName="codex-hebrew-install.json";
 internal static string DefaultRoot { get{return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","Codex Hebrew");} }
 internal static string Json(object value){return new JavaScriptSerializer().Serialize(value);}
 internal static T ReadJson<T>(string value){return new JavaScriptSerializer{MaxJsonLength=16*1024*1024}.Deserialize<T>(value);}
 internal static string Hash(byte[] bytes){using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
 internal static string HashFile(string file){using(var stream=File.OpenRead(file))using(var hash=SHA256.Create())return BitConverter.ToString(hash.ComputeHash(stream)).Replace("-","").ToLowerInvariant();}
 internal static string Quote(string value){if(value.Contains("\"")||value.EndsWith("\\"))throw new ArgumentException("Invalid process argument");return "\""+value+"\"";}
 internal static string Normalize(string path){if(path.StartsWith(@"\\?\UNC\",StringComparison.OrdinalIgnoreCase))path=@"\\"+path.Substring(8);else if(path.StartsWith(@"\\?\",StringComparison.Ordinal))path=path.Substring(4);return Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar);}
 // Codex bundles deep dependency paths; extended paths work with machine policy off.
 internal static string Extended(string path){path=Normalize(path);return path.StartsWith(@"\\",StringComparison.Ordinal)?@"\\?\UNC\"+path.Substring(2):@"\\?\"+path;}
 internal static bool Same(string a,string b){return String.Equals(Normalize(a),Normalize(b),StringComparison.OrdinalIgnoreCase);}
 internal static bool Inside(string root,string child){return Normalize(child).StartsWith(Normalize(root)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase);}
 internal static void NoLinks(string path){
  var directory=new DirectoryInfo(Extended(path));
  for(var item=directory;item!=null;item=item.Parent)if(item.Exists&&(item.Attributes&FileAttributes.ReparsePoint)!=0)throw new IOException("Installation paths cannot traverse links: "+item.FullName);
 }
 internal static void CheckTree(string root){
  NoLinks(root);
  foreach(var item in new DirectoryInfo(Extended(root)).EnumerateFileSystemInfos()){
   if((item.Attributes&FileAttributes.ReparsePoint)!=0)throw new IOException("Linked installation content is not supported: "+item.FullName);
   if((item.Attributes&FileAttributes.Directory)!=0)CheckTree(item.FullName);
  }
 }
 internal static void DeleteOwnedTree(string parent,string path){
  if(!Inside(parent,path))throw new IOException("Cleanup path is outside its installation parent");
  path=Extended(path);if(!Directory.Exists(path))return;CheckTree(path);
  foreach(var file in Directory.GetFiles(path)) {File.SetAttributes(file,FileAttributes.Normal);File.Delete(file);}
  foreach(var directory in Directory.GetDirectories(path))DeleteOwnedTree(path,directory);
  Directory.Delete(path);
 }
 internal static WindowsInstallReceipt RequireReceipt(string root){
  var receipt=ReadJson<WindowsInstallReceipt>(File.ReadAllText(Path.Combine(root,ReceiptName)));
  if(receipt==null||receipt.product!="codex-hebrew-windows"||receipt.root==null||!Same(root,receipt.root))throw new IOException("This folder is not a managed Codex Hebrew installation.");
  string settings=Path.Combine(root,"shared-data.json");
  if(File.Exists(settings))foreach(var pair in ReadJson<System.Collections.Generic.Dictionary<string,string>>(File.ReadAllText(settings)))
   if((pair.Key=="codexHome"||pair.Key=="userDataPath")&&(Same(root,pair.Value)||Inside(root,pair.Value)))throw new IOException("Conversation data must be outside the application folder before update or removal.");
  return receipt;
 }
 internal static void RequireStopped(string root){
  foreach(var process in Process.GetProcessesByName("ChatGPT"))using(process){
   string executable=null;try{executable=process.MainModule.FileName;}catch{continue;}
   if(Inside(root,executable))throw new IOException("יש לסגור את Codex בעברית, כולל במגש המערכת, לפני עדכון או הסרה.");
  }
 }
 internal static void CommitStage(string stage,string destination,Action verify){
  string parent=Path.GetDirectoryName(destination),backup=destination+".previous";
  if(Directory.Exists(backup))throw new IOException("נמצא גיבוי מהתקנה קודמת. יש לשחזר אותו לפני ניסיון נוסף: "+backup);
  bool previous=Directory.Exists(destination),installed=false;
  try{if(previous)Directory.Move(destination,backup);Directory.Move(stage,destination);installed=true;verify();}
  catch{if(installed)DeleteOwnedTree(parent,destination);if(previous&&Directory.Exists(backup))Directory.Move(backup,destination);throw;}
  // A committed install remains successful if backup cleanup fails.
  if(previous)try{DeleteOwnedTree(parent,backup);}catch(Exception error){System.Diagnostics.Trace.WriteLine("Installer backup retained: "+error.Message);}
 }
}
