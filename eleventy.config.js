export default function(eleventyConfig) {
  eleventyConfig.addLayoutAlias('default', 'default.html');

  // Copy assets folder to output
  eleventyConfig.addPassthroughCopy("assets");

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

  return {
    dir: {
      input: ".",
      includes: "_includes",
      layouts: "_layouts",
      output: "_site"
    }
  };
};
