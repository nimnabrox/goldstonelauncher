const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),loaded={exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync(path.join(root,'src/background-playback.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText)(loaded.exports,loaded);
const {attachBackgroundPlayback}=loaded.exports;
class Target {listeners=new Map();addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}emit(name){for(const fn of this.listeners.get(name)||[])fn();}get count(){return [...this.listeners.values()].reduce((n,s)=>n+s.size,0);}}
class Video extends Target {paused=true;muted=false;loop=false;currentTime=5;plays=0;pause(){this.paused=true;}play(){this.plays++;this.paused=false;return Promise.resolve();}}
const checks=[];const pass=name=>{checks.push(name);console.log('PASS '+name);};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const doc=new Target();doc.hidden=false;const win=new Target(),video=new Video(),env={document:doc,window:win};
  let cleanup=attachBackgroundPlayback(video,true,env);await flush();
  assert.equal(video.paused,false);assert.equal(video.muted,true);assert.equal(video.loop,true);pass('Visible background starts muted and looping');
  doc.hidden=true;doc.emit('visibilitychange');assert.equal(video.paused,true);
  doc.hidden=false;doc.emit('visibilitychange');await flush();assert.equal(video.paused,false);pass('Visibility pauses immediately and restores playback');
  cleanup();assert.equal(doc.count+win.count+video.count,0);const plays=video.plays;win.emit('focus');await flush();assert.equal(video.plays,plays);pass('Cleanup pauses playback and removes every event listener');
  cleanup=attachBackgroundPlayback(video,false,env);win.emit('focus');video.emit('canplay');assert.equal(video.paused,true);assert.equal(video.plays,plays);cleanup();pass('Game or disabled state cannot restart from focus or canplay');
  let finish;video.play=()=>new Promise(resolve=>{finish=()=>{video.paused=false;resolve();};});
  cleanup=attachBackgroundPlayback(video,true,env);cleanup();finish();await flush();assert.equal(video.paused,true);pass('Late play completion after cleanup stays paused');
  const old=attachBackgroundPlayback(video,true,env);const oldFinish=finish;
  old();const current=attachBackgroundPlayback(video,true,env);const currentFinish=finish;
  oldFinish();currentFinish();await flush();assert.equal(video.paused,false);current();pass('A stale completion cannot pause a newer active playback owner');
  fs.writeFileSync(path.join(root,'test-results/background-playback-results.json'),JSON.stringify({status:'passed',checks},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
