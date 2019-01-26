var app = app || {};

app.cookieCutter = function(cookie){
  var result = {}
    , str;

  str = cookie.split('; ');
  for (var i = 0; i < str.length; i++) {
      var cur = str[i].split('=');
      result[cur[0]] = cur[1];
  }
  return result
}

app.cookieCuller = function(name) {
  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

app.setAuthenticated = function(){
  cookieKeys = this.cookieCutter(document.cookie)
  cookieKeys = Object.keys(cookieKeys)

  if (_.indexOf(cookieKeys, "oauth_token") !== -1){
    this.authenticated = true;
  } else {
    this.authenticated = false;
  }
}

app.initialize = function(){
  this.setAuthenticated();
}

$(document).ready(function(){
  var tweetsView, tweetsCollection
    , planetView, auidoView
    , controlsView, infoView
    , socket;

  app.initialize();
  // event delegator for inter-view event handling
  vent = _.extend({}, Backbone.Events);
  // socket connection to the server
  socket = new WebSocket("ws://localhost:9000/socket");
  // the collection of tweets
  tweetsCollection = new app.TweetsCollection();
  // The main three.js scene
  planetView = new app.PlanetView({
    el: '#three',
    collection: tweetsCollection
  });
  // tweetsView
  tweetsView = new app.TweetsView({
    el: '#tweets',
    collection: tweetsCollection
  });
  // controls view
  auidoView = new app.AudioView({
    el: '#control_panel'
  });

  infoView = new app.InfoView({
    el: '#info'
  });

  vent.on('toggleTweets', function(msg){
    tweetsView.toggleTweets();
  });

  vent.on('toggleControls', function(bool){
    planetView.controls.enabled = bool;
  });

  vent.on('updateFollowerCount', function(count){
    tweetsView.followerCount = count;
    planetView.followerCount = count;
  });

  // on message, create a new tweetModel
  // and add it tweet to the collection
  socket.onmessage = function(ev){
    var tweet = JSON.parse(ev.data)
      , tweetModel = new app.TweetModel(tweet)
      , tweetText = tweetModel.get('text')
      , user = tweetModel.get('user')

    tweetModel.set('text', emojione.toImage(tweetText))
    user.screen_name = emojione.toImage(user.screen_name)
    tweetModel.set('user', user)
    tweetsCollection.add(tweetModel);
  }

  socket.onmessage();
});
