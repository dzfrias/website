const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const eleventyGoogleFonts = require("eleventy-google-fonts");
const faviconsPlugin = require("eleventy-plugin-gen-favicons");

module.exports = (config) => {
  config.addPassthroughCopy("./src/img/");
  config.addPassthroughCopy("./src/js/");

  config.setLibrary(
    "md",
    markdownIt({ html: true }).use(markdownItAnchor, {
      level: 2,
      permalink: markdownItAnchor.permalink.headerLink(),
    }),
  );

  config.addPlugin(eleventyGoogleFonts);
  config.addPlugin(syntaxHighlight);
  config.addPlugin(faviconsPlugin, {
    outputDir: "./dist",
  });
  config.addPlugin(eleventyImageTransformPlugin, {
    extensions: "html",
    formats: ["webp", "jpeg"],
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
    },
  });

  // Watch CSS files for changes
  config.setBrowserSyncConfig({
    files: ["dist/css/*.css"],
  });

  return {
    markdownTemplateEngine: false,
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "dist",
    },
  };
};
