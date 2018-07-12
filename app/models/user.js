var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var util = require('../../lib/utility');

const createHash = util.createHash;

var User = db.Model.extend({
  tableName: 'users',
  initialize: function () {
    this.on('creating', function(model, attrs, options) {
      const saltRounds = 10;
      const username = model.get('username');
      const password = model.get('password');
      return createHash(password, saltRounds)
        .then( (hash) => {
          model.set('username', username);
          model.set('password', hash);
        });
    });
  }
});

module.exports = User;