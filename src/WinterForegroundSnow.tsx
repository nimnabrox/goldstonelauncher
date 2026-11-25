import texture from './assets/winter/foreground-snow.svg';

export function WinterForegroundSnow({active}:{active:boolean}) {
  if(!active)return null;
  return <div className="winter-foreground-snow" aria-hidden="true">
    <div className="winter-foreground-snow-sheet" style={{backgroundImage:`url("${texture}")`}} />
  </div>;
}
