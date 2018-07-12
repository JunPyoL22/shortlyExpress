var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var cookieParser = require('cookie-parser');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(session({
  secret: '%$%^&!@#$9475109',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true,
    maxAge: 1000 * 60 * 60 // 쿠키 유효기간 1시간
  }
}));

app.get('/', 
  function(req, res) {
    var sess = req.session;
    if (!sess.username) {
      console.log('path: /, welcome! first visit.');
      res.redirect('login'); 
    } else {
      console.log('path: /, username: ', sess.username);
      res.render('index');
    }
    console.log('cookies: ', sess.cookies);
  });

app.get('/create', 
  function(req, res) {
    res.render('index');
  });

app.get('/links', 
  function(req, res) {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });
  });

app.get('/signup', 
  function(req, res) {
    res.render('signup');
  });

app.get('/login', 
  function(req, res) {
    res.render('login');
  });

app.get('/logout', 
  function(req, res) {
    var sess = req.session;
    if (sess.username) {
      req.session.destroy(function(err) {
        if (err) console.log(err);
        else res.redirect('/');
      });
    } else {
      res.redirect('/');
    }
  });   
  
app.post('/signup',
  function (req, res) {
    var {username, password} = req.body; 
    new User({ username : username }).fetch().then(function(found) {
      if (found) {
        res.send('username already exists');
      } else {
        Users.create({
          username : username,
          password : password 
        })
          .then(function() {
            res.redirect('/login');
          });
      }
    });
  }
);

app.post('/login',
  function (req, res) {
    const compareHash = util.compareHash;
    var {username, password} = req.body;
    req.session.username = username;
    new User({ username : username}).fetch().then(function(found) {
      if (!found) {
        res.send('username does not exists');
      } else {
        var hash = found.attributes.password;
        compareHash(password, hash)
          .then( (compared) => {
            if (!compared) {
              console.log('Password wrong!');
              res.redirect('/login');
            } else {
              res.redirect('/');
            }
          });
      }
    });
  }
);

app.post('/links', 
  function(req, res) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.sendStatus(404);
    }

    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.status(200).send(found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.sendStatus(404);
          } 

          Links.create({
            url: uri,
            title: title,
            baseUrl: req.headers.origin
          })
            .then(function(newLink) {
              res.status(200).send(newLink);
            });
        });
      }
    });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
