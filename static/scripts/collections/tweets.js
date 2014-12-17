var app = app || {};

app.TweetsCollection = Backbone.Collection.extend({
  model: app.TweetModel,
  url: '/post',
  initialize: function(models){}
});