export default function(eleventyConfig) {
  eleventyConfig.addLayoutAlias('default', 'default.html');

  // Copy assets folder to output
  eleventyConfig.addPassthroughCopy("assets");

  // Liquid configuration
  // dynamicPartials: false allows {% include file.html %} without quotes
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
