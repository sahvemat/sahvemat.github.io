export default function (eleventyConfig) {
  // Pass through copy for assets
  eleventyConfig.addPassthroughCopy("assets");
  
  // Set input and output directories
  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
};
