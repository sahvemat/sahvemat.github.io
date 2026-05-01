import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function(eleventyConfig) {
  eleventyConfig.addLayoutAlias('default', 'default.html');

  // Copy assets folder to output
  eleventyConfig.addPassthroughCopy("assets");

  // Shortcode to include any file content
  eleventyConfig.addLiquidShortcode("includeFile", function(filePath) {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
    return `/* Error: File ${filePath} not found at ${fullPath} */`;
  });

  // Liquid configuration
  // dynamicPartials: false allows {% include nav_top.html %} without quotes
  eleventyConfig.setLiquidOptions({
    dynamicPartials: false,
    strictFilters: false,
  });

  // Posts collection
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("_posts/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });

  // Featured posts collection
  eleventyConfig.addCollection("featured", function(collectionApi) {
    return collectionApi.getFilteredByGlob("_posts/*.md").filter(item => item.data.featured === true);
  });

  // Flash news posts collection
  eleventyConfig.addCollection("flash", function(collectionApi) {
    return collectionApi.getFilteredByGlob("_posts/*.md").filter(item => item.data.type === "flash");
  });

  // Analysis posts collection
  eleventyConfig.addCollection("analysis", function(collectionApi) {
    return collectionApi.getFilteredByGlob("_posts/*.md").filter(item => item.data.type === "analysis");
  });

  // Upcoming articles collection
  eleventyConfig.addCollection("upcoming", function(collectionApi) {
    return collectionApi.getFilteredByGlob("_posts/*.md").filter(item => item.data.type === "upcoming");
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      layouts: "_layouts",
      output: "_site"
    }
  };
};
