const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const md = require("markdown-it")();
const markdownItAnchor = require("markdown-it-anchor");
const eleventyGoogleFonts = require("eleventy-google-fonts");

module.exports = (config) => {
  const defaultImageRender = md.renderer.rules.image;
  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    return `<div class="expand-img"><button aria-haspopup="dialog" aria-label="Expand image">${defaultImageRender(tokens, idx, options, env, self)}</button><dialog>${defaultImageRender(tokens, idx, options, env, self)}</dialog></div>`;
  };

  config.addPassthroughCopy("./src/img/");
  config.addPassthroughCopy("./src/js/");
  // Favicons
  config.addPassthroughCopy({ "./src/favicon/*": "." });

  config.setLibrary(
    "md",
    md.use(markdownItAnchor, {
      level: 2,
      permalink: markdownItAnchor.permalink.headerLink(),
    }),
  );

  config.addPlugin(eleventyGoogleFonts);
  config.addPlugin(syntaxHighlight);
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
