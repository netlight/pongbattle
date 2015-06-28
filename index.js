var mongoose = require('mongoose');
var ENV = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
var MONGO_CONFIG = require('./config/mongodb.json')[ENV]
var mongoUri = process.env.EXTERNAL_MONGO_URI || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || MONGO_CONFIG.uri;
mongoose.connect(mongoUri);
var Contestant = require('./lib/models/contestant');
var Result = require('./lib/models/result');
var request = require('request');
var _ = require('lodash');
var moment = require('moment');
var numeral = require('numeral');
var async = require('async');

var transactionCost = 800;

String.prototype.toObjectId = function() {
  var ObjectId = (require('mongoose').Types.ObjectId);
  return new ObjectId(this.toString());
};

//DataPoint.calculateDerivedValues(function() {
//  console.log('updated derived values');
//});
//DataPoint.calculateRelativeValues(function(err) {
//  if (err) {
//    console.log(err);
//  } else {
//    console.log('updated relative values');
//  }
//});
//DataPoint.calculateQualityScores(function(err) {
//  if (err) {
//    console.log(err);
//  } else {
//    console.log('updated quality scores');
//  }
//});
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var basicAuth = require('basic-auth-connect');
var protect = basicAuth('car', 'peero');
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.set('view engine', 'ejs');
var jsonParser = bodyParser.json();
var formParser = bodyParser.urlencoded();
app.use(jsonParser);
app.use(formParser);
app.use(express.static('static'));
app.get('/arena', function(req, res, next) {
  res.render('arena');
});
app.get('/contestant/:id', function(req, res) {
  async.waterfall([
      function(cb) {
        if (req.params.id === 'new') {
          return cb(null, new Contestant());
        }
        Contestant.findById(req.params.id.toObjectId(), function(err, contestant) {
          return cb(err, contestant);
        });
      }
  ], function(err, contestant) {
    res.render('contestant', { id: req.params.id, contestant: contestant });
  });
});
app.post('/contestant/:id', function(req, res) {
  function store(c) {
    c.name = req.body.name;
    c.code = req.body.code;
    c.save(function(err) {
      if (err) {
        return res.send(err);
      }
      return res.redirect('/contestant/'+ c._id);
    });
  }
  if (req.params.id === 'new') {
    var c = new Contestant();
    return store(c);
  }
  Contestant.findById(req.params.id.toObjectId(), function(err, c) {
    if (err) {
      return res.end(err);
    }
    return store(c);
  });
});
app.use(function(err, req, res, next) {
  res.set('content-type', 'application/json');
  res.status(500).send(JSON.stringify(err, ["message", "arguments", "type", "name"]));
});
io.on('connection', function(socket) {
  console.log('a user connected');
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
  socket.on('getContestants', function() {
    console.log('wants contestants');
    Contestant.findNextContestants(function(err, contestantLeft, contestantRight) {
      socket.emit('getContestants', contestantLeft, contestantRight);
    });
  });
  socket.on('getHighscores', function() {
    console.log('wants highscores');
    Contestant.findHighscores(function(err, highscores) {
      socket.emit('getHighscores', highscores);
    });
  });
  socket.on('saveResult', function(result) {
    function updateCountsFor(id, cb) {
      Contestant.findById(id, function(err, c) {
        Result.getWinCountForPlayer(id, function(err, loadedWins) {
          c.wins = loadedWins;
          Result.getResultCountForPlayer(id, function(err, loadedResults) {
            c.results = loadedResults;
            c.save(cb);
          });
        });
      })
    }
    console.log('wants to save result $j', result);
    var r = new Result();
    var c1Id = result.contestants[0].toObjectId();
    var c2Id = result.contestants[1].toObjectId();
    r.contestantLeft = c1Id;
    r.contestantRight = c2Id;
    r.winner = result.winner.toObjectId();
    r.scoreLeft = result.scoreLeft;
    r.scoreRight = result.scoreRight;
    r.upsert(function(err) {
      //update wins for both players
      updateCountsFor(c1Id, function(err) {
        updateCountsFor(c2Id, function(err) {
          console.log('updated result');
        });
      });
    });
  });
});

http.listen(process.env.PORT || 5000, function() {
  console.log('listening on *:5000');
});