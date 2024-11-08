const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const md = require("markdown-it")({ html: true });
const markdownItAnchor = require("markdown-it-anchor");
const eleventyGoogleFonts = require("eleventy-google-fonts");
const pluginTOC = require("eleventy-plugin-toc");
const { minify } = require("terser");

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

  config.setLibrary("md", md.use(require("markdown-it-footnote")));
  // Default footnote renderer without brackets
  md.renderer.rules.footnote_caption = function (tokens, idx) {
    let n = Number(tokens[idx].meta.id + 1).toString();
    if (tokens[idx].meta.subId > 0) n += `:${tokens[idx].meta.subId}`;
    return n;
  };
  const refDefaultRender = md.renderer.rules.footnote_ref;
  md.renderer.rules.footnote_ref = function (tokens, idx, options, env, self) {
    return refDefaultRender(tokens, idx, options, env, self).replace(
      "<a",
      '<a role="doc-noteref" aria-label="go to footnote"',
    );
  };
  const fnDefaultRender = md.renderer.rules.footnote_anchor;
  md.renderer.rules.footnote_anchor = function (
    tokens,
    idx,
    options,
    env,
    self,
  ) {
    return fnDefaultRender(tokens, idx, options, env, self).replace(
      "<a",
      '<a role="doc-backlink" aria-label="back to text"',
    );
  };
  md.renderer.rules.footnote_block_open = () =>
    "<hr/>\n" +
    '<section class="footnotes" role="doc-endnotes">\n' +
    '<ol class="footnotes-list">\n';
  md.renderer.rules.footnote_block_close = () => "</ol>" + "</section>";

  config.addPassthroughCopy("./src/img/");
  config.addPassthroughCopy("./src/fonts/");
  // Favicons
  config.addPassthroughCopy({ "./src/favicon/*": "." });

  config.setLibrary("md", md.use(require("markdown-it-katex")));
  config.setLibrary(
    "md",
    md.use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.headerLink(),
    }),
  );

  config.addCollection("sortedPosts", function (collectionApi) {
    return collectionApi.getFilteredByTag("posts").sort(function (a, b) {
      return b.date - a.date;
    });
  });

  config.addPlugin(eleventyGoogleFonts);
  config.addPlugin(syntaxHighlight, {
    preAttributes: {
      class: ({ language }) => `language-${language || "plain"}`,
    },
    errorOnInvalidLanguage: false,
  });
  config.addPlugin(pluginTOC);
  config.addPlugin(eleventyImageTransformPlugin, {
    extensions: "html",
    formats: ["webp", "jpeg"],
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
    },
  });

  config.addFilter("jsmin", async function (code) {
    try {
      const minified = await minify(code, { module: true });
      return minified.code;
    } catch (err) {
      console.error("Terser error: ", err);
      return code;
    }
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
