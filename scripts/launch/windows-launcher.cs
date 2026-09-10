using System;
using System.Diagnostics;
using System.IO;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class HebrewLauncher {
 internal static string ExistingDataPath(Dictionary<string,string> settings,string key) {
  string value;
  if(!settings.TryGetValue(key,out value)||String.IsNullOrWhiteSpace(value)||!Path.IsPathRooted(value))
   throw new InvalidDataException("shared-data.json requires an absolute "+key+" path.");
  value=Path.GetFullPath(value);
  if(!Directory.Exists(value))throw new DirectoryNotFoundException("Shared Codex data was not found: "+value);
  return value;
 }

 internal static ProcessStartInfo CreateLaunch(string root,string data) {
  string profile=Path.Combine(data,"profile"),codex=Path.Combine(data,"codex-home");
  string sharedFile=Path.Combine(root,"shared-data.json");
  if(File.Exists(sharedFile)) {
   var settings=new JavaScriptSerializer().Deserialize<Dictionary<string,string>>(File.ReadAllText(sharedFile));
   if(settings==null)throw new InvalidDataException("shared-data.json must contain an object.");
   profile=ExistingDataPath(settings,"userDataPath");codex=ExistingDataPath(settings,"codexHome");
  }else{Directory.CreateDirectory(profile);Directory.CreateDirectory(codex);}
  var start=new ProcessStartInfo(Path.Combine(root,"app","ChatGPT.exe"));
  start.WorkingDirectory=Path.Combine(root,"app");start.UseShellExecute=false;start.CreateNoWindow=true;
  // Matching userData also shares Electron's native single-instance lock on Windows.
  start.Arguments="--user-data-dir=\""+profile+"\" --lang=he --force-ui-direction=rtl";
  start.EnvironmentVariables["CODEX_ELECTRON_USER_DATA_PATH"]=profile;
  start.EnvironmentVariables["CODEX_HOME"]=codex;
  start.EnvironmentVariables["CODEX_SPARKLE_ENABLED"]="false";
  start.EnvironmentVariables.Remove("CODEX_THREAD_ID");
  return start;
 }

 [STAThread]
 private static void Main() {
  try {
   string root=AppDomain.CurrentDomain.BaseDirectory;
   string data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Codex Hebrew");
   Process.Start(CreateLaunch(root,data));
  }catch(Exception error){MessageBox.Show(error.Message,"Codex Hebrew",MessageBoxButtons.OK,MessageBoxIcon.Error);}
 }
}
