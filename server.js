import express from 'express';
import { Liquid } from 'liquidjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fm from 'front-matter';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const engine = new Liquid({
  root: [path.join(__dirname, '_layouts'), path.join(__dirname, '_includes')],
  extname: '.html'
});

// Helper to get all posts
async function getPosts() {
  const postsDir = path.join(__dirname, '_posts');
  if (!fs.existsSync(postsDir)) return [];
  
  const files = fs.readdirSync(postsDir);
  return files.map(file => {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const { attributes, body } = fm(content);
    
    // Extract date from filename: YYYY-MM-DD-title.md
    const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
    const date = dateMatch ? new Date(dateMatch[1]) : new Date();
    const slug = dateMatch ? dateMatch[2] : file.replace('.md', '');

    return {
      ...attributes,
      content: marked(body),
      date,
      url: `/posts/${slug}/`,
      slug
    };
  }).sort((a, b) => b.date - a.date);
}

app.get('/', async (req, res) => {
  const posts = await getPosts();
  const indexContent = fs.readFileSync(path.join(__dirname, 'index.md'), 'utf8');
  const { attributes, body } = fm(indexContent);
  
  const site = {
    title: 'ŞAHMAT',
    posts: posts,
    time: new Date()
  };

  const renderedBody = await engine.parseAndRender(body, { site, page: attributes });
  const finalHtml = await engine.renderFile(attributes.layout || 'default', { 
    content: renderedBody,
    site,
    page: attributes
  });
  
  res.send(finalHtml);
});

// Serve posts
app.get('/posts/:slug/', async (req, res) => {
  const posts = await getPosts();
  const post = posts.find(p => p.slug === req.params.slug);
  
  if (!post) return res.status(404).send('Not Found');

  const site = {
    title: 'ŞAHMAT',
    posts: posts,
    time: new Date()
  };

  const finalHtml = await engine.renderFile(post.layout || 'default', { 
    content: post.content,
    site,
    page: post
  });
  
  res.send(finalHtml);
});

// Serve assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.listen(port, () => {
  console.log(`Jekyll-like server listening at http://localhost:${port}`);
});
