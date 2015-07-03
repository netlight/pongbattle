var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');

var resultSchema = new Schema({
  contestantLeft: { type: Schema.Types.ObjectId, ref: 'contestant', index: true },
  contestantRight: { type: Schema.Types.ObjectId, ref: 'contestant', index: true },
  scoreLeft: Number,
  scoreRight: Number,
  winner: { type: Schema.Types.ObjectId, ref: 'contestant', index: true },
});
var createdModifiedPlugin = require('mongoose-createdmodified').createdModifiedPlugin;
resultSchema.index({contestantLeft: 1, contestantRight: 1}, {unique: true});
resultSchema.plugin(createdModifiedPlugin, {index: true});

resultSchema.statics.findForContestants = function(id1, id2, cb) {
  return this.findOne({"$or":[{contestantLeft: id1, contestantRight: id2}, {contestantLeft: id2, contestantRight: id1}]}).exec(cb)
};

resultSchema.statics.getWinCountForPlayer = function(id, cb) {
  this.count({winner: id}).exec(cb);
};

resultSchema.statics.getResultCountForPlayer = function(id, cb) {
  this.count({"$or": [{contestantLeft: id}, {contestantRight: id}]}).exec(cb);
};

resultSchema.statics.removeForContestant = function(id, cb) {
  this.remove({"$or": [{contestantLeft: id}, {contestantRight: id}]}).exec(cb);
};

resultSchema.methods.upsert = function(cb) {
  var that = this;
  var data = this.toObject();
  delete data._id;
  this.constructor.findForContestants(data.contestantLeft, data.contestantRight, function(err, res) {
    var insert = false;
    if (!res) {
      insert = true;
      res = new that.constructor();
    }
    _.extend(res, data);
    return res.save(cb);
  });
}

module.exports = mongoose.model('result', resultSchema);