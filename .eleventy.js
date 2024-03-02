const htmlmin = require("html-minifier");

module.exports = (config) => {
  config.addPassthroughCopy("./src/images/");
  config.addPassthroughCopy("./src/fonts/");

  config.addTransform("htmlmin", function (content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }
    return content;
  });

  // Watch CSS files for changes
  config.setBrowserSyncConfig({
    files: ["dist/css/*.css"],
  });

  return {
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "dist",
    },
  };
};
