var LonelyPlanetAudio = {
	songIndex : -1,
	audioPlayer : $('#audio_player'),
	baseUrl : "static/media/audio/",
	songs : [
		{ name: "Gary Jules - Mad World", path: this.baseUrl + "mad_world.mp3"},
		{ name: "Sinead O'Connor - Nothing Compares", path: this.baseUrl + "nothing_compares.mp3" }
		{ name: "George Michael - One More Try", path: this.baseUrl + "one_more_try.mp3" },
		{ name: "Elliot Smith - Miss Misery", path: this.baseUrl + "miss_misery.mp3" },
		{ name: "Alice In Chains - Nutshell", path: this.baseUrl + "nutshell.mp3" },
		{ name: "Radiohead - No Surprises", path: this.baseUrl + "no_surprises.mp3" },
		{ name: "Imogen Heap - Hide and Seek", path: this.baseUrl + "hide_and_seek.mp3" },
		{ name: "The Smiths - I Know It's Over", path: this.baseUrl + "i_know_its_over.mp3" },
	],
	init : function(){

		$('body').append('<audio id="audio_player" type="audio/mp3"></audio>')
		this.play()

		this.audioPlayer.on('ended', function(){
			
			audioPlayer.src = songPaths[songIndex];
			songIndex !== 7 ? songIndex++ : songIndex = 0;

		})

	}, 
	play : function(){
			
		this.audioPlayer.play()

	},
	pause: function(){

		this.audioPlayer.pause()

	},
	forward: function(){

		this.songIndex !== this.songs.length - 1 ? this.songIndex++ : this.songIndex = 0;
		this.audioPlayer.src = this.songs[songIndex].path

	},
	back: function(){

		this.songIndex !== 0 ? this.songIndex-- : this.songIndex = this.songs.length;
		this.audioPlayer.src = this.songs[songIndex].path
	
	},
	updateSong: function(){

		$('#song_name').html(this.songs[songIndex].name)

	}
}

