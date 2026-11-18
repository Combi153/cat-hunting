import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { shareContent, SHARE_RESULTS, PUBLIC_GAME_URL } from '../src/share-content.js';
const base = await readFile('dist/index.html', 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const result of SHARE_RESULTS) {
  const card = shareContent(result);
  await access(`dist/${card.image}`);
  let html = base;
  const values = {
    description: card.text, 'og:title': card.title, 'og:description': card.text,
    'og:url': card.url, 'og:image': PUBLIC_GAME_URL + card.image,
    'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': card.title,
    'twitter:title': card.title, 'twitter:description': card.text,
    'twitter:image': PUBLIC_GAME_URL + card.image, 'twitter:image:alt': card.title,
  };
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*("\\s*/?>)`, 'g');
    if (!pattern.test(html)) throw new Error(`Missing metadata: ${key}`);
    html = html.replace(pattern, (_, before, after) => before + escape(value) + after);
  }
  html = html.replace(/<title>.*?<\/title>/, `<title>${escape(card.title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]+/, '$1' + card.url);
  const dir = 'dist' + new URL(card.url).pathname;
  await mkdir(dir, {recursive: true});
  await writeFile(dir + 'index.html', html);
}
console.log('Built 10 static result share pages with stage-specific metadata.');
