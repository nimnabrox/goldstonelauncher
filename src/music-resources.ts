/** Bounded audio URLs. Keep the active source alive while evicting older files. */
export class MusicBlobCache {
  private entries = new Map<string, {url:string; bytes:number}>();
  private pending = new Map<string, Promise<string>>();
  private closed = false;
  constructor(private active:()=>string = ()=>'', private maxEntries=6, private maxBytes=32*1024*1024,
    private urls={create:(blob:Blob)=>URL.createObjectURL(blob), revoke:(url:string)=>URL.revokeObjectURL(url)}) {}
  get isDisposed() { return this.closed; }
  get stats() { return {entries:this.entries.size, pending:this.pending.size, bytes:[...this.entries.values()].reduce((n,e)=>n+e.bytes,0)}; }
  get(key:string, load:()=>Promise<Blob>):Promise<string> {
    if(this.closed)return Promise.reject(new Error('Audio cache disposed'));
    const hit=this.entries.get(key);
    if(hit){this.entries.delete(key);this.entries.set(key,hit);return Promise.resolve(hit.url);}
    const existing=this.pending.get(key);if(existing)return existing;
    const operation=(async()=>{
      const blob=await load();
      if(this.closed)throw new Error('Audio cache disposed');
      const url=this.urls.create(blob);
      this.entries.set(key,{url,bytes:blob.size});
      this.trim(key);
      return url;
    })().finally(()=>this.pending.delete(key));
    this.pending.set(key,operation);return operation;
  }
  trim(protectedKey?:string) {
    for(const [key,item] of this.entries) {
      if(this.stats.entries<=this.maxEntries&&this.stats.bytes<=this.maxBytes)break;
      if(key===protectedKey||item.url===this.active())continue;
      this.urls.revoke(item.url);this.entries.delete(key);
    }
  }
  dispose(){this.closed=true;for(const item of this.entries.values())this.urls.revoke(item.url);this.entries.clear();this.pending.clear();}
}

/** One delayed poll, no overlapping refreshes, and no timers after disposal. */
export function createMusicRefreshLoop(options:{refresh:()=>Promise<unknown>; schedule:(fn:()=>void,delay:number)=>number;
  cancel:(id:number)=>void; now:()=>number; visible:()=>boolean; interval?:number; cooldown?:number; lastCheck?:number}) {
  let timer:number|undefined,disposed=false,running=false;
  let lastCheck=options.lastCheck??options.now();
  const clear=()=>{if(timer!==undefined)options.cancel(timer);timer=undefined;};
  const schedule=()=>{clear();if(!disposed)timer=options.schedule(()=>{timer=undefined;void request(true);},options.interval??300000);};
  const request=async(force=false)=>{
    if(disposed||running)return;
    if(!options.visible()||(!force&&options.now()-lastCheck<(options.cooldown??60000))){schedule();return;}
    clear();running=true;lastCheck=options.now();
    try{await options.refresh();}catch{/* next poll/online event retries */}
    finally{running=false;if(!disposed)schedule();}
  };
  return {start:()=>void request(false),request,dispose:()=>{disposed=true;clear();},get lastCheck(){return lastCheck;}};
}
