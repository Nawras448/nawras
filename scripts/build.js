const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PREFIX_FOR = (depth) => depth === 0 ? './' : '../'.repeat(depth);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const indexTpl = fs.readFileSync(path.join(ROOT, 'templates', 'index.html'), 'utf8');
const articleTpl = fs.readFileSync(path.join(ROOT, 'templates', 'article.html'), 'utf8');

function arDate(iso) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso + 'T00:00:00'));
  } catch (e) { return iso; }
}
function stripMd(s) { return s.replace(/[#>*`\[\]()!|-]/g, ' ').replace(/\s+/g, ' ').trim(); }
function excerptOf(data, body) {
  if (data.excerpt) return String(data.excerpt);
  return stripMd(body).slice(0, 160);
}
function readingOf(body) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
function navHtml(prefix) {
  return cfg.nav.map(n => `<a href="${prefix}${n.href}">${n.label}</a>`).join('\n');
}
function socialHtml() {
  const icons = { x: '✕', github: 'GH', telegram: '✈', instagram: '◍' };
  return cfg.social.map(s => `<a href="${s.href}" aria-label="${s.label}" title="${s.label}">${icons[s.key] || '•'}</a>`).join('');
}
function fill(tpl, map) {
  let out = tpl;
  for (const k of Object.keys(map)) out = out.split('{{' + k + '}}').join(map[k]);
  return out;
}
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
marked.setOptions({ breaks: true });
function articlePage(a, bodyHtml) {
  const prefix = PREFIX_FOR(2);
  const ogImg = a.image ? `<meta property="og:image" content="${a.image}">` : '';
  return fill(articleTpl, {
    SITE_NAME: cfg.siteName, TITLE: a.title, EXCERPT: a.excerpt.replace(/"/g, '&quot;'),
    OG_IMAGE: ogImg, PREFIX: prefix, NAV: navHtml(prefix), SOCIAL: socialHtml(),
    CATEGORY: a.category, DATE_AR: arDate(a.date), READING: a.readingTime + ' دقائق قراءة',
    IMAGE: a.image ? `<img src="${prefix}${a.image}" alt="${a.title}" style="border:1px solid var(--line)">` : '',
    BODY: bodyHtml, SLUG: a.slug, FOOTER: cfg.footer
  });
}
function simplePage(title, bodyHtml, depth) {
  const prefix = PREFIX_FOR(depth);
  return fill(articleTpl, {
    SITE_NAME: cfg.siteName, TITLE: title, EXCERPT: cfg.description.replace(/"/g, '&quot;'),
    OG_IMAGE: '', PREFIX: prefix, NAV: navHtml(prefix), SOCIAL: socialHtml(),
    CATEGORY: 'صفحة', DATE_AR: '', READING: '',
    IMAGE: '', BODY: `<h1>${title}</h1>` + bodyHtml, SLUG: '', FOOTER: cfg.footer
  });
}
function slugify(name, n) {
  let s = String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!s || !/[a-z0-9]/.test(s)) {
    const h = require('crypto').createHash('md5').update(String(name), 'utf8').digest('hex').slice(0, 6);
    s = 'article-' + (h || String(n));
  }
  return s.slice(0, 80).replace(/-+$/g, '') || ('article-' + n);
}
function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const files = fs.readdirSync(path.join(ROOT, 'articles')).filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md');
  const used = new Map();
  const articles = files.map((f, idx) => {
    const rawName = path.basename(f, '.md');
    let slug = slugify(rawName, idx + 1);
    if (used.has(slug)) {
      const k = used.get(slug) + 1;
      used.set(slug, k);
      let c = 2;
      let cand = slug + '-' + c;
      while (used.has(cand)) { c++; cand = slug + '-' + c; }
      console.warn('Duplicate slug "' + slug + '" from "' + f + '", using "' + cand + '" instead.');
      slug = cand;
    }
    used.set(slug, 1);
    const raw = fs.readFileSync(path.join(ROOT, 'articles', f), 'utf8');
    const { data, content } = matter(raw);
    if (!data || !data.title) { console.warn('WARNING: skipped "' + f + '" (missing front-matter "title").'); return null; }
    const bodyHtml = marked.parse(content);
    let d = data.date || '2026-01-01';
    if (d instanceof Date) d = d.toISOString().slice(0, 10);
    else d = String(d).slice(0, 10);
    const a = {
      slug, title: data.title || slug, date: d,
      category: data.category || 'عام', excerpt: excerptOf(data, content),
      image: data.image || '', featured: !!data.featured, readingTime: readingOf(content)
    };
    return { ...a, bodyHtml };
  }).filter(Boolean).sort((x, y) => String(y.date).localeCompare(String(x.date)));
  const meta = articles.map(({ bodyHtml, ...m }) => m);
  fs.writeFileSync(path.join(DIST, 'articles.json'), JSON.stringify(meta, null, 2));
  for (const a of articles) {
    const dir = path.join(DIST, 'articles', a.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), articlePage(a, a.bodyHtml));
  }
  const home = fill(indexTpl, {
    SITE_NAME: cfg.siteName, TAGLINE: cfg.tagline, DESCRIPTION: cfg.description,
    PREFIX: PREFIX_FOR(0), NAV: navHtml(PREFIX_FOR(0)), SOCIAL: socialHtml(),
    FOOTER: cfg.footer
  });
  fs.writeFileSync(path.join(DIST, 'index.html'), home);
  const aboutRaw = fs.readFileSync(path.join(ROOT, 'about.md'), 'utf8');
  const aboutBody = marked.parse(matter(aboutRaw).content);
  fs.mkdirSync(path.join(DIST, 'about'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'about', 'index.html'), simplePage('من أنا', aboutBody, 1));
  fs.mkdirSync(path.join(DIST, 'categories'), { recursive: true });
  const catBody = '<h1 id="catTitle">التصنيفات</h1><div id="catList"></div><hr><div class="cards" id="cards"></div>';
  fs.writeFileSync(path.join(DIST, 'categories', 'index.html'), simplePage('التصنيفات', catBody, 1));
  fs.mkdirSync(path.join(DIST, 'contact'), { recursive: true });
  const contactBody = `<h1>تواصل</h1><p>يسعدني تواصلك! اختر الوسيلة المناسبة:</p>` +
    cfg.social.map(s => `<p><a href="${s.href}">${s.label}</a></p>`).join('') +
    `<p>أهلًا بك في أي وقت.</p>`;
  fs.writeFileSync(path.join(DIST, 'contact', 'index.html'), simplePage('تواصل', contactBody, 1));
  const base = cfg.baseUrl.replace(/\/$/, '');
  const urls = ['', 'about/', 'categories/', 'contact/'].concat(articles.map(a => `articles/${a.slug}/`));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.map(u => `<url><loc>${base}/${u}</loc></url>`).join('') + `</urlset>`;
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
  const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${cfg.siteName}</title><link>${base}/</link><description>${cfg.description}</description>` +
    articles.map(a => `<item><title>${a.title}</title><link>${base}/articles/${a.slug}/</link><description>${a.excerpt.replace(/</g, '&lt;')}</description><pubDate>${a.date}</pubDate></item>`).join('') + `</channel></rss>`;
  fs.writeFileSync(path.join(DIST, 'feed.xml'), rss);
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
  console.log('Built ' + articles.length + ' articles -> dist/');
}
main();

