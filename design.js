var util = require('util'),
    Document = require('./document.js').Document;


/**
 * design document object
 *
 * @constructor
 * @param {string|null} id string if you have document id, null if not
 * @param {cushion.Connection} connection cushion connection object
 * @param {cushion.Database} database cushion database object
 */
var Design = function(id, revision, connection, database) {
  Document.call(this, id, revision, connection, database);
};

util.inherits(Design, Document);


/**
 * get, create or update a show function
 *
 * @param {string} name name of the show function
 * @param {?string} content string representation of the show function
 * @return {cushion.Design|string} if you save a show function, you will get
 *     this design document, otherwise the string representation of the specific
 *     show function
 */
Design.prototype.show = function(name, content) {
  if (content) {
    // create shows object?
    this._body.shows = this._body.shows || {};
    this._body.shows[name] = content;
  }

  return ((content) ?
    this :
    (this._body.shows) ? this._body.shows[name] : undefined
  );
};


/**
 * get, create or update a view
 *
 * @param {string} name name of the view
 * @param {string} map string representation of the map function
 * @param {?string} reduce string representation of the
 *     reduce function
 * @return {cushion.Design|object} if you set a view, you will get this design
 *     document, otherwise you will get the view object with the string
 *     representations of the map and reduce functions
 */
Design.prototype.view = function(name, map, reduce) {
  if (map) {
    // create views object?
    this._body.views = this._body.views || {};
    this._body.views[name] = this._body.views[name] || {};

    this._body.views[name].map = map;
    if (reduce) {
      this._body.views[name].reduce = reduce;
    }
  }

  return ((map) ?
    this :
    (this._body.views) ? this._body.views[name] : undefined
  );
};

exports.Design = Design;