export default function (eleventyConfig) {
  // Pass through copy for assets
  eleventyConfig.addPassthroughCopy("assets");
  
  // Set input and output directories
  return {
    dir: {
      input: ".",
      output: "dist",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
};
