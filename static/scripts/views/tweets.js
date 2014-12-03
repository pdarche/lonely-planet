// NOTE: Namespacing is good but is probably not needed
var app = app || {};

var TweetsView = Backbone.View.extend({
  initialize: function() {
    var self = this
      , cookieKeys

    cookieKeys = self.cookieCutter(document.cookie)
    cookieKeys = Object.keys(cookieKeys)
    
    if (_.indexOf(cookieKeys, "oauth_token") !== -1){
      this.authenticated = true;
    } else {
      this.authenticated = false;
    }

    this.showTweet = false;
    this.prepend = true;
    this.tweetIndex = 0;


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

    if (this.prepend){
      this.$el.prepend(html);
      this.$el.find('.tweet').eq(0).hide().fadeIn()      
    }
  },

  events: {
    "mouseover .tweet": "onMouseOver",
    "mouseleave .tweet": "onMouseOut",
    "click .tweet": "onClick"
  },

  onMouseOver: function(ev){
    this.prepend = false;
  },

  onMouseOut: function(ev){
    var target = $(ev.currentTarget)
      , reply = target.find('.reply')
      
    this.prepend = true;
    reply.fadeOut()
      .queue(function(){
        target.css('width', '300px');
        reply.dequeue();
      });
  },

  onClick: function(ev){
    var target = $(ev.currentTarget)
    if (this.authenticated){
      target.css('width', '655px').delay(450)
        .queue(function(){
          target.find('.reply').fadeIn();
          target.find('textarea').focus();
          target.dequeue();
        });
    }
  },

  cookieCutter: function(cookie){
    var result = {}
      , str;

    str = cookie.split('; ');
    for (var i = 0; i < str.length; i++) {
        var cur = str[i].split('=');
        result[cur[0]] = cur[1];
    }
    return result
  }

});