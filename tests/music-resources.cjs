const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),loaded={exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync(path.join(root,'src/music-resources.ts'),'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}
}).outputText)(loaded.exports,loaded);
const {MusicBlobCache,createMusicRefreshLoop}=loaded.exports;
const checks=[];function pass(name){checks.push(name);console.log('PASS '+name);}
(async()=>{
  let active='',created=0;const revoked=[];
  const cache=new MusicBlobCache(()=>active,3,20,{create:()=>`blob:${++created}`,revoke:u=>revoked.push(u)});
  let resolve;const pending=new Promise(r=>resolve=r);let reads=0;
  const first=cache.get('a',()=>{reads++;return pending;});const duplicate=cache.get('a',()=>{reads++;return pending;});
  resolve(new Blob(['12345678']));assert.equal(await first,await duplicate);assert.equal(reads,1);
  active=await first;pass('Concurrent requests for one song share one read and one object URL');
  await cache.get('b',async()=>new Blob(['12345678']));await cache.get('c',async()=>new Blob(['12345678']));
  assert.ok(!revoked.includes(active));assert.ok(cache.stats.bytes<=20);assert.ok(cache.stats.entries<=3);
  pass('Cache evicts older inactive audio within entry/byte targets without revoking the playing source');
  cache.dispose();assert.equal(cache.stats.entries,0);assert.equal(cache.stats.bytes,0);assert.ok(revoked.includes(active));
  pass('Disposal revokes all remaining object URLs');
  const late=new MusicBlobCache(()=>'',6,100,{create:()=>{throw Error('Must not create after disposal');},revoke:()=>{}});
  let lateResolve;const latePromise=late.get('late',()=>new Promise(r=>lateResolve=r));late.dispose();lateResolve(new Blob(['x']));
  await assert.rejects(latePromise,/disposed/);assert.equal(late.stats.pending,0);
  pass('An unfinished audio read cannot allocate a URL after disposal');
  let now=0,id=0,calls=0,finish;const timers=new Map();
  const loop=createMusicRefreshLoop({refresh:()=>{calls++;return new Promise(r=>finish=r);},
    schedule:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},cancel:key=>timers.delete(key),now:()=>now,visible:()=>true});
  loop.start();assert.equal(timers.size,1);assert.equal([...timers.values()][0].delay,300000);assert.equal(calls,0);
  pass('Idle automatic checking uses one five-minute timeout, not a fast interval');
  const timer=[...timers.values()][0];timers.clear();now=300000;timer.fn();assert.equal(calls,1);
  await loop.request(true);await loop.request(true);assert.equal(calls,1);assert.equal(timers.size,0);
  finish();await new Promise(r=>setImmediate(r));assert.equal(timers.size,1);
  pass('Refresh requests do not overlap and the next poll waits for completion');
  loop.dispose();assert.equal(timers.size,0);await loop.request(true);assert.equal(calls,1);
  pass('Disposal cancels polling and ignores future refresh requests');
  fs.writeFileSync(path.join(root,'test-results/music-resource-results.json'),JSON.stringify({status:'passed',checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
