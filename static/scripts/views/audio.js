// NOTE: Namespacing is good but is probably not needed
var app = app || {};

var AudioView =  Backbone.View.extend({
  initialize: function() {
    var self = this;

    this.basePath = "static/media/audio/";
    // song filenames
    this.songPaths = [ 
      "mad_world.mp3", "nothing_compares.mp3", "one_more_try.mp3", 
      "miss_misery.mp3", "nutshell.mp3", 
      "no_surprises.mp3", "hide_and_seek.mp3",
      "i_know_its_over.mp3"
    ];
    // song titles
    this.songNames = [
      "Gary Jules - Mad World" , "Sinead O'Connor - Nothing Compares",
      "George Michael - One More Try", "Elliot Smith - Miss Misery", 
      "Alice In Chains - Nutshell", "Radiohead - No Surprises", 
      "Imogen Heap - Hide and Seek", "The Smiths - I Know It's Over"
    ];
    // song index
    this.songIndex = 0;
    
    // load and render the template
    $.when($.get('/static/scripts/templates/audioControls.Handlebars'))
     .done(function(tmpl){
      self.tmpl = tmpl;
      self.render();
      self.audioPlayer = document.getElementById('audio_player')
      self.audioPlayer.play();
      self.updateSongTitle();
     });

  },

  render: function() {
    var source = $(this.tmpl).html()
      , tmpl   = Handlebars.compile(source)
      , html   = tmpl;

    this.$el.append(html);    
  },

  events: {
    "click #flag": "toggleControls",
    "click #play": "play",
    "click #pause": "pause",
    "click #forward": "forward",
    "click #back": "back",
    "click #play, #pause": "toggleActiveAudio"
  },

  toggleControls: function(){
    $('#control_panel').toggleClass("shown", "hidden");

  },

  toggleActiveAudio: function(ev){
    $('.active-audio').removeClass('active-audio');
    $(ev.target).addClass('active-audio');

  },
  
  play : function(){
    this.audioPlayer.play();
    this.updateSongTitle();
  },
  pause: function(){
    this.audioPlayer.pause();
    this.updateSongTitle(); 
  },
  
  forward: function(){
    this.songIndex !== 7 ? this.songIndex++ : this.songIndex = 0;
    this.audioPlayer.src = this.basePath + this.songPaths[this.songIndex]
    this.audioPlayer.play();
    this.updateSongTitle();

  },

  back: function(){
    this.songIndex !== 0 ? this.songIndex-- : this.songIndex = 7;
    this.audioPlayer.src = this.basePath + this.songPaths[this.songIndex]
    this.audioPlayer.play();
    this.updateSongTitle();

  },

  updateSongTitle: function(){
    var currentSongTitle = this.songNames[this.songIndex]

    $('#song_name').html(currentSongTitle)
  }
});