$(document).ready(function(){
  var tweetsView, tweetsCollection
    , planetView, auidoView
    , controlsView, socket;
  
  // event delegator for inter-view event handling
  vent = _.extend({}, Backbone.Events);
  // socket connection to the server
  socket = new WebSocket("ws://localhost:9000/socket");
  // the collection of tweets
  tweetsCollection = new TweetsCollection();
  // The main three.js scene
  planetView = new PlanetView({
    el: '#three',
    collection: tweetsCollection
  });
  // tweetsView
  tweetsView = new TweetsView({
    el: '#tweets',
    collection: tweetsCollection
  });
  // controls view
  auidoView = new AudioView({
    el: '#control_panel'
  });

  vent.on('toggleTweets', function(msg){
    tweetsView.toggleTweets()
  })
  // on message, create a new tweetModel
  // and add it tweet to the collection
  socket.onmessage = function(ev){
    var tweet = JSON.parse(ev.data)
      , tweetModel = new TweetModel(tweet);

    tweetsCollection.add(tweetModel);
  }
  
  socket.onmessage();
});