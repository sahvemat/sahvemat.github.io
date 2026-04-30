export default function(eleventyConfig) {
  // Set layout aliases
  eleventyConfig.addLayoutAlias('default', 'default.html');

  // Liquid configuration
  eleventyConfig.setLiquidOptions({
    dynamicPartials: false,
    strictFilters: false,
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      layouts: "_layouts",
      output: "dist"
    }
  };
};
