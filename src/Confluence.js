const https   = require('https');
let http    = require('http');
const omitEmpty = require('omit-empty');

const Page    = require('./lib/Page');

if (!process.env['NODE_TLS_REJECT_UNAUTHORIZED']) { process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'; }

class Confluence {
  constructor(options) {
    if (options == null) { options = {}; }
    this.useSSL   = options.useSSL || true;

    this.username = options.username || process.env.CONFLUENCE_USERNAME || process.env.ATLASSIAN_USERNAME;
    this.password = options.password || process.env.CONFLUENCE_PASSWORD || process.env.ATLASSIAN_PASSWORD;
    this.host     = options.host     || process.env.CONFLUENCE_HOST     || process.env.ATLASSIAN_HOST;
    this.port     = options.port     || process.env.CONFLUENCE_PORT     || process.env.ATLASSIAN_PORT || (this.useSSL ? 443 : 80);
    this.context  = options.context  || process.env.CONFLUENCE_CONTEXT  || '';
  }

  page(page) {
    if (page == null) { page = {}; }
    return new Page(page);
  }

  getContent(params, callback) {
    return this.XHR("GET", "/content", params, null, callback);
  }

  createContent(params, payload, callback) {
    return this.XHR("POST", "/content", params, payload, callback);
  }

  getContentById(contentId, params, callback) {
    return this.XHR("GET", `/content/${contentId}`, params, null, callback);
  }

  updateContent(contentId, payload, callback) {
    return this.XHR("PUT", `/content/${contentId}`, null, payload, callback);
  }

  upsertPage(searchCQL, payload, callback) {
    const confluence = this;
    let page = new Page(payload);
    return this.advancedSearch(searchCQL, {expand: 'version'}, function(err, res) {
      if (err) { return callback(err, res); }
      if (res.results[0] != null) {
        page.id = res.results[0].id;
        page.title = payload.title || res.results[0].title;
        page.version = res.results[0].version;
        page.version.number = res.results[0].version.number + 1;
        return confluence.updateContent(page.id, omitEmpty(page), (err, res) => callback(err, res));
      } else {
        page = new Page(payload);
        return confluence.createContent(null, payload, (err, res) => callback(err, res));
      }
    });
  }

  deleteContent(contentId, callback) {
    return this.XHR("DELETE", `/content/${contentId}`, null, null, callback);
  }

  getContentHistory(contentId, params, callback) {
    return this.XHR("GET", `/content/${contentId}/history`, params, null, callback);
  }

  getContentLabels(contentId, params, callback) {
    return this.XHR("GET", `/content/${contentId}/label`, params, null, callback);
  }
    
  setContentLabels(contentId, payload, callback) {
    return this.XHR("POST", `/content/${contentId}/label`, null, payload, callback);
  }

  getContentChildren(contentId, params, callback) {
    return this.XHR("GET", `/content/${contentId}/child`, params, null, callback);
  }

  getContentChildByType(contentId, type, params, callback) {
    return this.XHR("GET", `/content/${contentId}/child/${type}`, params, null, callback);
  }

  getContentComments(contentId, params, callback) {
    return this.XHR("GET", `/content/${contentId}/child/comment`, params, null, callback);
  }

  getContentAttachment(contentId, params, callback) {
    return this.XHR("GET", `/content/${contentId}/child/attachment`, params, null, callback);
  }

  updateContentAttachment(contentId, attachmentId, params, callback) {
    return this.XHR("PUT", `/content/${contentId}/child/attachment/${attachmentId}`, params, null, callback);
  }

  getSpaces(params, callback) {
    return this.XHR("GET", "/space", params, null, callback);
  }

  getSpace(spaceKey, params, callback) {
    return this.XHR("GET", `/space/${spaceKey}`, params, null, callback);
  }

  getSpaceContentType(spaceKey, type, params, callback) {
    return this.XHR("GET", `/space/${spaceKey}/content/${type}`, params, null, callback);
  }

  createSpace(key, name, description, params, callback) {
    if (!params) {
      params = {};
    }
    params.spaceKey = key;
    params.name = name;
    params.description = {
      plain: {
        value: description,
        representation: 'plain'
      }
    };
    return this.XHR("POST", "/space", params, null, callback);
  }

  simpleSearch(query, params, callback) {
    if (!params) {
      params = {};
    }
    params.cql = `type=page and title~'${query}'`;
    return this.XHR("GET", "/content/search", params, null, callback);
  }

  advancedSearch(cql, params, callback) {
    if (!params) {
      params = {};
    }
    params.cql = cql;
    return this.XHR("GET", "/content/search", params, null, callback);
  }

  //  utils
  XHR(method, api, params, payload, callback) {
    if (params === null) {
      params = '';
    } else {
      params = toURL(params);
    }

    const payloadString = JSON.stringify(payload);

    const options = {
      host: this.host,
      port: this.port,
      path: `${this.context}/rest/api${api}${params}`,
      method,
      auth: `${this.username}:${this.password}`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString)
      }
    };

    http = (this.useSSL ? https : http);
    const req = http.request(options, function(res) {
      res.setEncoding('utf8');
      let response = '';

      res.on('data', data => response += data);

      return res.on('end', function() {
        if (res.statusCode !== 200) {
          return callback(`Request failed with status code ${res.statusCode}. --  ${options.method} ${options.host}${options.path}`, response);
        } else {
          let jsonResponse;
          try {
            jsonResponse = JSON.parse(response);
          } catch (e) {
            return callback(`Could not parse as JSON response. ${e}. --  ${options.method} ${options.host}:${options.port}${options.path}`);
          }
          return callback(null, jsonResponse);
        }
      });
    });

    req.on('error', e => callback(`HTTPS ERROR: ${e}`));

    req.write(payloadString);
    return req.end;
  }
}

var toURL = obj => '?' + Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');

module.exports = new Confluence();
