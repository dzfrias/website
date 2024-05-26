const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const md = require("markdown-it")({ html: true });
const markdownItAnchor = require("markdown-it-anchor");
const eleventyGoogleFonts = require("eleventy-google-fonts");

module.exports = (config) => {
  const proxy = (tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options);

  // Override image rendering to use popups
  const defaultImageRender = md.renderer.rules.image || proxy;
  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    return `<div class="expand-img"><button aria-haspopup="dialog" aria-label="Expand image">${defaultImageRender(tokens, idx, options, env, self)}</button><dialog>${defaultImageRender(tokens, idx, options, env, self)}</dialog></div>`;
  };

  // Override the way headers are rendered in markdown to be shifted by 1
  // Taken from https://github.com/markdown-it/markdown-it/issues/871#issuecomment-1752196424
  const defaultHeadingOpenRenderer = md.renderer.rules["heading_open"] || proxy;
  const defaultHeadingCloseRenderer =
    md.renderer.rules["heading_close"] || proxy;
  const increase = (tokens, idx) => {
    // Don't go smaller than 'h6'
    if (parseInt(tokens[idx].tag[1]) < 6) {
      tokens[idx].tag = tokens[idx].tag[0] + (parseInt(tokens[idx].tag[1]) + 1);
    }
  };
  md.renderer.rules["heading_open"] = function (
    tokens,
    idx,
    options,
    env,
    self,
  ) {
    increase(tokens, idx);
    return defaultHeadingOpenRenderer(tokens, idx, options, env, self);
  };
  md.renderer.rules["heading_close"] = function (
    tokens,
    idx,
    options,
    env,
    self,
  ) {
    increase(tokens, idx);
    return defaultHeadingCloseRenderer(tokens, idx, options, env, self);
  };

  config.addPassthroughCopy("./src/img/");
  config.addPassthroughCopy("./src/fonts/");
  config.addPassthroughCopy("./src/js/");
  // Favicons
  config.addPassthroughCopy({ "./src/favicon/*": "." });

  config.setLibrary(
    "md",
    md.use(markdownItAnchor, {
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
