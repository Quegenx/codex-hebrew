using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

internal static class WindowsLauncherChecks {
 static void Check(bool condition,string message) { if(!condition)throw new Exception(message); }
 static void Main(string[] args) {
  string root=Path.GetFullPath(args[0]);
  Check(!Directory.Exists(root),"Use a new task-local test directory.");
  Directory.CreateDirectory(root);
  string isolated=Path.Combine(root,"isolated"),shared=Path.Combine(root,"shared data");
  string parentHome=Environment.GetEnvironmentVariable("CODEX_HOME");
  string parentThread=Environment.GetEnvironmentVariable("CODEX_THREAD_ID");
  var initial=HebrewLauncher.CreateLaunch(root,isolated);
  Check(initial.EnvironmentVariables["CODEX_HOME"]==Path.Combine(isolated,"codex-home"),"Isolated default changed.");
  Directory.CreateDirectory(shared);
  string profile=Path.Combine(shared,"original profile"),home=Path.Combine(shared,"original home");
  Directory.CreateDirectory(profile);Directory.CreateDirectory(home);
  var settings=new Dictionary<string,string>{{"codexHome",home},{"userDataPath",profile}};
  string config=Path.Combine(root,"shared-data.json");
  File.WriteAllText(config,new JavaScriptSerializer().Serialize(settings));
  var launch=HebrewLauncher.CreateLaunch(root,Path.Combine(root,"unused"));
  Check(launch.EnvironmentVariables["CODEX_HOME"]==home,"Shared history path mismatch.");
  Check(launch.EnvironmentVariables["CODEX_ELECTRON_USER_DATA_PATH"]==profile,"Shared profile mismatch.");
  Check(launch.Arguments.Contains("--user-data-dir=\""+profile+"\""),"Profile with spaces is not quoted.");
  Check(!launch.EnvironmentVariables.ContainsKey("CODEX_THREAD_ID"),"Parent task must not leak into child.");
  Check(!Directory.Exists(Path.Combine(root,"unused")),"Shared launch created an isolated store.");
  Check(Environment.GetEnvironmentVariable("CODEX_HOME")==parentHome,"Parent home changed.");
  Check(Environment.GetEnvironmentVariable("CODEX_THREAD_ID")==parentThread,"Parent task changed.");
  foreach(string bad in new[]{"relative",Path.Combine(root,"missing"),""}) {
   settings["codexHome"]=bad;
   File.WriteAllText(config,new JavaScriptSerializer().Serialize(settings));
   bool rejected=false;
   try {HebrewLauncher.CreateLaunch(root,Path.Combine(root,"unused"));}
   catch(InvalidDataException) {rejected=true;}
   catch(DirectoryNotFoundException) {rejected=true;}
   Check(rejected,"Invalid shared data path silently accepted.");
  }
  Check(!Directory.Exists(Path.Combine(root,"unused")),"Invalid configuration silently fell back.");
  Console.WriteLine("Windows launcher checks passed; no application or model was started.");
 }
}
