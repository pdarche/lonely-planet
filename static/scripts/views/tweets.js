// NOTE: Namespacing is good but is probably not needed
var app = app || {};

var TweetsView = Backbone.View.extend({
  initialize: function() {
    var self = this;
    // fetch and cache the tweet template
    $.when($.get('/static/scripts/templates/tweet.Handlebars'))
     .done(function(tmpl){
      self.tmpl = tmpl;
     });

    // bind new tweet event to the collection
    this.collection.bind('add', $.proxy(this.render, this));
  },

  render: function(tweet){
    var source = $(this.tmpl).html()
      , tmpl   = Handlebars.compile(source)
      , html   = tmpl({"tweet":this.collection.last().toJSON()});

    this.$el.prepend(html);

  }
});