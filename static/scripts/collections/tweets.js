// NOTE: Namespacing is good but is probably not needed
var app = app || {};

var TweetsCollection = Backbone.Collection.extend({
  model: TweetModel,
  url: '/post',
  initialize: function(models){
    
  }
});