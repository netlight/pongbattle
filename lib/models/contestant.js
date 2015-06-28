var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Result = require('./result');
var hash = require('object-hash');
var async = require('async');

var contestantSchema = new Schema({
  name: { type: String, unique: true },
  code: { type: String, required: true },
  codeHash: { type: String },
  wins: {type: Number, index: true, default: 0},
  results: {type: Number, index: true, default: 0}
});
var createdModifiedPlugin = require('mongoose-createdmodified').createdModifiedPlugin;
contestantSchema.plugin(createdModifiedPlugin, {index: true});

contestantSchema.statics.findHighscores = function(cb) {
  this.find().sort({wins:-1}).exec(cb);
}

contestantSchema.pre('validate', function(next) {
  this.codeHash = hash(this.code);
  return next();
});

contestantSchema.statics.findNextContestants = function(cb) {
  var that = this;
  function findNotPlayedPartner(allContestants, contestant1, cb) {
    var contestant2 = null;
    async.eachSeries(allContestants, function(testContestant, cb) {
      if (contestant2 || testContestant._id.toString() === contestant1._id.toString()) {
        return cb()
      }
      Result.findForContestants(contestant1._id, testContestant._id, function(err, result) {
        if (err) {
          return cb(err);
        }
        if (result) {
          return cb();
        }
        contestant2 = testContestant;
        return cb();
      });
    }, function(err) {
      return cb(err, contestant2);
    });
  }

  /**
   * this function makes sure that two contestants will always play on the same sides if they encounter each other, based on hashes build form the source code
   * @param contestant1
   * @param contestant2
   * @param cb
   * @returns {*}
   */
  function alignContestants(contestant1, contestant2, cb) {
    // go and determine left and right player based on hashed code
    if (contestant1.codeHash.localeCompare(contestant2.codeHash)) {
      return cb(contestant1, contestant2);
    } else {
      return cb(contestant2, contestant1);
    }
  }
  var contestant1;
  var contestant2;
  // start off by getting all contestants
  this.find().exec(function(err, allContestants) {
    // now find all that have less results than allContestants.length - 1
    that.find({results: {$lt: allContestants.length-1}}).exec(function(err, remainingContestants) {
      if (!remainingContestants || remainingContestants.length === 0) {
        // every player has already played all games needed so let's send a random pair
        contestant1 = allContestants[Math.floor(Math.random()*allContestants.length)];
        while (!contestant2 || contestant1._id.toString()===contestant2._id.toString()) {
          contestant2 = allContestants[Math.floor(Math.random()*allContestants.length)];
        }
        return alignContestants(contestant1, contestant2, function(cLeft, cRight) {
          return cb(null, cLeft, cRight)
        });
      }
      // use the first contestant that has open games as the first contestant
      contestant1 = remainingContestants[0];
      // find a contestant where the game combination is still missing
      findNotPlayedPartner(allContestants, contestant1, function(err, contestant2) {
        return alignContestants(contestant1, contestant2, function(cLeft, cRight) {
          return cb(null, cLeft, cRight)
        });
      });
    });
  });
  // if all contestants have all their scores saved take two random contestants
  // if a contestant is still missing a result play this result next
}

module.exports = mongoose.model('contestant', contestantSchema);