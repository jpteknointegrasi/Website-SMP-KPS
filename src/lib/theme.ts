// Day/night theme (shared by the <head> script and the header toggle)
export const THEME_KEY = 'kps-theme'

/**
 * Runs in <head> before the page paints: picks the visitor's saved choice,
 * otherwise the device setting (and keeps following it until the visitor chooses).
 */
export const themeInitScript = `(function(){try{var k='${THEME_KEY}',d=document.documentElement,m=window.matchMedia('(prefers-color-scheme: dark)'),s=localStorage.getItem(k);d.dataset.theme=s==='dark'||s==='light'?s:(m.matches?'dark':'light');m.addEventListener&&m.addEventListener('change',function(e){if(!localStorage.getItem(k))d.dataset.theme=e.matches?'dark':'light'})}catch(e){}})()`
