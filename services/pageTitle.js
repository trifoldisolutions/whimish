function pageTitle(pageType, facade) {
  return facade ? `Whimish ${facade} - ${pageType}` : `Whimish - ${pageType}`;
}

module.exports = pageTitle;
