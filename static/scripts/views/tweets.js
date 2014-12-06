// NOTE: Namespacing is good but is probably not needed
var app = app || {};

var TweetsView = Backbone.View.extend({
  initialize: function() {
    var self = this
      , cookieKeys

    this.prepend = true;
    cookieKeys = this.cookieCutter(document.cookie)
    cookieKeys = Object.keys(cookieKeys)
    
    if (_.indexOf(cookieKeys, "oauth_token") !== -1){
      this.authenticated = true;
    } else {
      this.authenticated = false;
    }
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
      , tweet  = this.collection.last()
      , html   = tmpl({"tweet":tweet.toJSON(), "cid": tweet.cid});

    if (this.prepend){
      this.$el.prepend(html);
      this.$el.find('.tweet').eq(0).hide().fadeIn()      
    }

  },

  events: {
    "mouseover .tweet": "onMouseOver",
    "mouseleave .tweet": "onMouseOut",
    "click .tweet": "onClick",
    "click .reply-button": "postReply"
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
      , reply = target.find('.reply')
      , textarea = reply.find('textarea')
      , cid = target.attr('id')
      , model = this.collection.get(cid)

    if (this.authenticated){
      target.css('width', '655px').delay(450)
        .queue(function(){
          reply.fadeIn();
          textarea.focus();
          textarea.val('@' + model.get('user').screen_name)
          target.dequeue();
        });
    }

  },

  postReply: function(ev){
    ev.preventDefault();
    var tweet = $(ev.currentTarget).parent().parent()
      , cid = tweet.attr('id')
      , model = this.collection.get(cid)
      , responseText = $(ev.currentTarget).prev().val();
    
    model.set('responseText', responseText);
    model.save(null, {
      success: function(model, res, options){
        tweet.find('textarea').val('Reply posted!')
      }
    });

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