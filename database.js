'use strict';

var querystring = require('querystring'),
    Document = require('./document.js').Document,
    Design = require('./design.js').Design;


/**
 * database object
 *
 * @constructor
 * @param {string} name of the database
 * @param {cushion.Connection} connection connection object
 */
var Database = function(name, connection) {
  this._name = name;
  this._connection = connection;
};


/**
 * getting all documents of the database, because this is a special couchdb view
 * you can use the same query parameters like at normal views
 *
 * @param {object|function(error, info, documents)} paramsOrCallback query
 *     parameters for the view
 * @param {?function(error, info, object)} callback function that
 *     will be called, after getting response from the view, or if there was an
 *     error
 */
Database.prototype.allDocuments = function(paramsOrCallback, callback) {
  var params = (typeof(paramsOrCallback) === 'object') ?
               '?' + querystring.stringify(paramsOrCallback, '&', '=') :
               '';
  callback = callback || paramsOrCallback;

  this._connection.request({
    'method': 'GET',
    'path': this.name() + '/_all_docs' + params,
    'callback': (function(error, response) {
      var info,
          documents = {},
          i;

      if (error === null) {
        info = {
          'total': response.total_rows,
          'offset': response.offset
        };

        for (i = 0; response.rows[i]; ++i) {
          documents[response.rows[i].id] = response.rows[i].value.rev;
        }
      }

      callback(error, info, documents);
    }).bind(this)
  });
};


/**
 * cleanup views
 *
 * @param {function(error, started)} callback function that will be called,
 *     after cleanup was started or if there was an error
 */
Database.prototype.cleanup = function(callback) {
  this._connection.request({
    'method': 'POST',
    'path': this.name() + '/_view_cleanup',
    'callback': function(error, response) {
      callback(error, (response) ? true : null);
    }
  });
};


/**
 * compacts the database or specific view
 *
 * @param {string} designOrCallback name of a design if you only want to compact
 *     a view, or function that will be called, after compaction was started of
 *     if there was an error
 * @param {?function(error, started)} callback function that will be called,
 *     after compaction was started or if there was an error
 */
Database.prototype.compact = function(designOrCallback, callback) {
  var design = (callback) ? designOrCallback : undefined;
  callback = callback || designOrCallback;

  this._connection.request({
    'method': 'POST',
    'path': this.name() + '/_compact' + ((design) ? '/' + design : ''),
    'callback': (function(error, response) {
      callback(error, (response) ? true : null);
    }).bind(this)
  });
};


/**
 * create the database
 *
 * @param {function(error, confirm)} callback function that will be called,
 *     after creating the database, or if there was an error
 */
Database.prototype.create = function(callback) {
  this._connection.request({
    'method': 'PUT',
    'path': this.name(),
    'callback': (function(error, response) {
      if (error === null && response.ok === true) {
        response = true;
      }

      callback(error, response);
    }).bind(this)
  });
};


/**
 * delete the database
 *
 * @param {function(error, deleted)} callback function that will be called,
 *     after deleting the database, or if there was an error
 */
Database.prototype.destroy = function(callback) {
  this._connection.request({
    'method': 'DELETE',
    'path': this.name() ,
    'callback': function(error, response) {
      if (response && response.ok === true) {
        response = true;
      }

      callback(error, response);
    }
  });
};


/**
 * gets a document object
 *
 * @param {?string} docId id of the couch document
 * @param {?string} revision revision of the document
 * @return {cushion.Document} the document object
 */
Database.prototype.document = function(docId, revision) {
  var Doc = (docId && docId.match(/^_design\//)) ? Design : Document;

  return new Doc(
    docId || null,
    revision || null,
    this._connection,
    this
  );
};


/**
 * saves all uncommited stuff to the disk
 *
 * @param {function(error, success)} callback function that will be called,
 *     after successfully started the save operation, or if there was an error
 */
Database.prototype.ensureFullCommit = function(callback) {
  this._connection.request({
    'method': 'POST',
    'path': this._name + '/_ensure_full_commit',
    'callback': function(error, response) {
      callback(error, (error === null && response.ok === true));
    }
  });
};


/**
 * check if database exists
 *
 * @param {function(error, exists)} callback function that will be called, after
 *     getting the information database exists or not, of if there was an error
 */
Database.prototype.exists = function(callback) {
  this._connection.request({
    'method': 'GET',
    'path': this._name,
    'callback': function(error) {
      var exists = true;

      if (error && error.error === 'not_found') {
        error = null;
        exists = false;
      }

      callback(error, (error === null) ? exists : null);
    }
  });
};


/**
 * gets infos about the database
 *
 * @param {function(error, info)} callback function that will be called, after
 *     getting the informations, or if there was an error
 */
Database.prototype.info = function(callback) {
  this._connection.request({
    'method': 'GET',
    'path': this._name,
    'callback': callback
  });
};


/**
 * requests a list
 *
 * @param {string} design name of the design document, after the '_design/'
 * @param {string} list name of the list function
 * @param {string} viewOrOtherDesign name of the view, or name of another design
 *     document, which holds the view function
 * @param {string|object|function(error, response)} viewOrParamsOrCallback name
 *     of the view function, or an object which holds query parameters for the
 *     request or function that will be called, after getting a response or if
 *     there was an error
 * @param {?object|function(error, response)} paramsOrCallback an object with
 *     key-value-pairs that holds query parameters for the request, or function
 *     that will be called, after getting a response, or if there was an error
 * @param {?function(error, response)} callback function that will be called,
 *     after getting a response or if there was an error
 */
Database.prototype.list = function(
  design,
  list,
  viewOrOtherDesign,
  viewOrParamsOrCallback,
  paramsOrCallback,
  callback
) {
  var params = (typeof(viewOrParamsOrCallback) === 'object') ?
               '?' + querystring.stringify(viewOrParamsOrCallback, '&', '=') :
               (typeof(paramsOrCallback) === 'object') ?
                 '?' + querystring.stringify(paramsOrCallback, '&', '=') :
                 '',
      view = (typeof(viewOrParamsOrCallback) === 'string') ?
             viewOrParamsOrCallback :
             viewOrOtherDesign,
      otherDesign = (typeof(viewOrParamsOrCallback) === 'string') ?
                    '/' + viewOrOtherDesign :
                    '',
      path = this.name() + '/_design/' + design + '/_list/' + list +
             otherDesign + '/' + view + params;
      callback = callback || paramsOrCallback || viewOrParamsOrCallback;

  this._connection.request({
    'method': 'GET',
    'path': path,
    'callback': callback
  });
};


/**
 * gets name of this database
 *
 * @return {string} name of this database
 */
Database.prototype.name = function() {
  return this._name;
};


/**
 * makes a purge operation
 *
 * @param {object} documents key-value-object with document-id's as keys and
 *     an array with document revisions as value
 * @param {function(error, purged)} callback function that will be called, after
 *     successfully purging the document, or if there was an error
 */
Database.prototype.purge = function(documents, callback) {
  this._connection.request({
    'method': 'POST',
    'path': this._name + '/_purge',
    'body': documents,
    'callback': function(error, response) {
      callback(error, (error) ? null : response.purged);
    }
  });
};


/**
 * sets or gets the document revision limit
 * if you set two arguments (limit and callback) it will use as a setter
 * only with one argument (callback) it's a getter
 *
 * @param {number|function(error, limit)} limitOrCallback positive integer as a
 *     new setting for the revision limit or function that will be called, after
 *     getting the revision limit or if there was an error
 * @param {?function(error, saved)} callback function that will be called, after
 *     setting the new revision limit or if there was an error
 */
Database.prototype.revisionLimit = function(limitOrCallback, callback) {
  var limit = (callback) ? limitOrCallback : null,
      options = {
        'method': (limit !== null) ? 'PUT' : 'GET',
        'path': this._name + '/_revs_limit'
      };
  callback = callback || limitOrCallback;

  if (limit !== null) {
    options.body = '' + limit;
  }

  options.callback = function(error, response) {
    if (error) {
      callback(error, null);
    } else if (limit === null) {
      callback(null, response);
    } else {
      callback(null, true);
    }
  };

  this._connection.request(options);
};


/**
 * retrieving a show function
 *
 * @param {string} design name of the design document, after the '_design/',
 * @param {string} show name of the show function
 * @param {string|object|function(error, result)} docIdOrQueryOrCallback id of
 *     the document or additional query params for the show function, or
 *     function that will be called after getting a result or if there was an
 *     error
 * @param {?object|function(error, result)} queryOrCallback additional query
 *     params for the show function, or function that will be called after
 *     getting a result or if there was an error
 * @param {?function(error, result)} callback function that will be called after
 *     getting a result or if there was an error
 */
Database.prototype.show = function(
  design,
  show,
  docIdOrQueryOrCallback,
  queryOrCallback,
  callback
) {
  var docId = (typeof(docIdOrQueryOrCallback) === 'string') ?
        '/' + docIdOrQueryOrCallback :
        '',
      query = '';
  callback = callback || queryOrCallback || docIdOrQueryOrCallback;

  if (typeof(docIdOrQueryOrCallback) === 'object') {
    query = '?' + querystring.stringify(docIdOrQueryOrCallback, '&', '=');
  } else if (typeof(queryOrCallback) === 'object') {
    query = '?' + querystring.stringify(queryOrCallback, '&', '=');
  }

  this._connection.request({
    'method': 'GET',
    'path': this._name +
      '/_design/' + design +
      '/_show/' + show +
      docId + query,
    'callback': callback
  });
};


/**
 * requests a temporary view
 *
 * @param {string} map map function for the view as a string not as a function
 * @param {string|function(error, info, rows)} reduceOrCallback reduce function
 *     for the view as a string not as a function or function that will be
 *     called after retrieving the view or if there was an error
 * @param {?function(error, info, rows)} callback function that will be called,
 *     after retrieving the view or if there was an error
 */
Database.prototype.temporaryView = function(
  map,
  reduceOrParamsOrCallback,
  paramsOrCallback,
  callback
) {
  var reduce = (typeof(reduceOrParamsOrCallback) === 'string') ?
               reduceOrParamsOrCallback :
               null,
      params = (typeof(reduceOrParamsOrCallback) === 'object') ?
               reduceOrParamsOrCallback :
               paramsOrCallback,
      body = {'map': map};
  callback = callback || paramsOrCallback || reduceOrParamsOrCallback;
  params = querystring.stringify(params, '&', '=');

  if (reduce !== null) {
    body.reduce = reduce;
  }

  this._connection.request({
    'method': 'POST',
    'path': this.name() + '/_temp_view' + ((params) ? '?' + params : ''),
    'body': body,
    'callback': function(error, response) {
      var info = null,
          rows = null;

      if (error === null) {
        info = {
          'total': response.total_rows,
          'offset': response.offset
        };

        rows = response.rows;
      }

      callback(error, info, rows);
    }
  });
};


/**
 * requests a view
 *
 * @param {string} design name of the design document, after the '_design/'
 * @param {string} view name of the view
 * @param {object|function(error, info, rows)} paramsOrCallback query
 *     parameters for the view, or function that will be call, after getting
 *     response from the view, or if there was an error
 * @param {?function(error, info, rows)} callback function that will be
 *     called, after getting response from the view, or if there was an error
 */
Database.prototype.view = function(design, view, paramsOrCallback, callback) {
  var params = '';
  if(typeof paramsOrCallback === 'object') {
    paramsOrCallback = JSON.parse(JSON.stringify(paramsOrCallback));
    for(var key in paramsOrCallback) {
      var paramsOrCallback[key] = JSON.stringify(paramsOrCallback[key]);
    }
    params = '?' + querystring.stringify(paramsOrCallback, '&', '=');
  }
  path = this.name() + '/_design/' + design + '/_view/' + view;
  callback = callback || paramsOrCallback;

  this._connection.request({
    'method': 'GET',
    'path': path + params,
    'callback': (function(error, response) {
      var info = null,
          rows = null;

      if (error === null) {
        info = {
          'total': response.total_rows,
          'offset': response.offset
        };

        rows = response.rows;
      }

      callback(error, info, rows);
    }).bind(this)
  });
};


exports.Database = Database;
