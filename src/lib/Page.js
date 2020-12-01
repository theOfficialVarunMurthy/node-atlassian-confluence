//TODO: overwrite @constructor arguments, but don't drop unused values

class Page {
  constructor(p) {
    if (p == null) { p = {}; }
    this.space = p.space || {};
    this.body = p.body || {};
    this.body.storage = (p.body != null ? p.body.storage : undefined) || {};
    this.version = p.version || {};
    this.title = p.title || "New p";
    this.type = p.type || 'page';
    this.space = p.space || {};
    if (p.space != null ? p.space.key : undefined) { this.space.key = p.space != null ? p.space.key : undefined; }
    this.body = p.body || {};
    this.body.storage = (p.body != null ? p.body.storage : undefined) || {};
    this.body.storage.value = __guard__(p.body != null ? p.body.storage : undefined, x => x.value) || '';
    this.body.storage.representation  = (p.storage != null ? p.storage.representation : undefined) || 'storage';
    this.version = p.version || {};
    this.version.number = (p.version != null ? p.version.number : undefined) || 1;
  }
}


module.exports = Page;
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}