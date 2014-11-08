	var songPaths = [ 
			"static/media/audio/nothing_compares.mp3", "static/media/one_more_try.mp3", 
			"static/media/audio/miss_misery.mp3", "static/media/nutshell.mp3", 
			"static/media/audio/no_surprises.mp3", "static/media/hide_and_seek.mp3",
			"static/media/audio/i_know_its_over.mp3", "static/media/mad_world.mp3" 
		],
		songNames = [
			"Sinead O'Connor - Nothing Compares", "George Michael - One More Try", 
			"Elliot Smith - Miss Misery", "Alice In Chains - Nutshell",
			"Radiohead - No Surprises", "Imogen Heap - Hide and Seek",
			"The Smiths - I Know It's Over", "Gary Jules - Mad World" 
		]
		songIndex = -1,
		audioPlayer = document.getElementById('audio_player'),
		actions = { 
			"play" : function(){
				
				audioPlayer.play()

			},
			"pause": function(){

				audioPlayer.pause()

			},
			"forward": function(){

				songIndex !== 7 ? songIndex++ : songIndex = 0;
				audioPlayer.src = songPaths[songIndex]

			},
			"back": function(){
				songIndex !== 0 ? songIndex-- : songIndex = 7;
				audioPlayer.src = songPaths[songIndex]
				
			}
		}

	$('#audio_player').on('ended', function(){
		
		audioPlayer.src = songPaths[songIndex];
		songIndex !== 7 ? songIndex++ : songIndex = 0;

	})

	$('.audio-control').click(function(){
		
		var action = $(this).attr('id')
		actions[action]()
		updateSong()
		
	})

	function updateSong(){
		$('#song_name').html(songNames[songIndex])
	}

