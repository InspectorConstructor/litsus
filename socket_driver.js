// socket_driver.js

// todo make this more intimidating
console.log('               __     __           __                           __');
console.log('   ____ ____  / /_   / /___  _____/ /_     ____  ___  _________/ /');
console.log('  / __ `/ _ \/ __/  / / __ \/ ___/ __/    / __ \/ _ \/ ___/ __  / ');
console.log(' / /_/ /  __/ /_   / / /_/ (__  ) /__    / / / /  __/ /  / /_/ /  ');
console.log(' \__, /\___/\__/  /_/\____/____/\__( )  /_/ /_/\___/_/   \__,_/   ');
console.log('/____/                             |/                             ');

// define callbacks for socket event(s)
var my_id = 'todo',
    current_track = '',
    timer = null,
    limiter = {
        limit: function(){}
    },
    time_remaining = 0, // ms
    sounds = {
	lit: new Audio("assets/lit_airhorn.mp3"),
	sus: new Audio("assets/sus_airhorn.mp3"),
	gong: new Audio("assets/gong.mp3"),
    },
    gifs = {
	lit: ["eifelfireworks.gif", /*"fireworkice.gif",*/ "cheeseburger.gif", "taylor.gif", 
	      "pikachu.gif", "pearl.gif", "dogebat.gif", "mariocape.gif", ],

	sus: ["ohface.gif", "blaargh.gif", "prodkick.gif", "wookie.gif",
	      "mariojump.gif", "oprah.gif",  "taco.gif",   "mokeypush.gif", "kermit.gif"],
    },
    lit_gif_idx = 0,
    sus_gif_idx = 0,
    socket = io(window.location.href);

    Object.freeze(gifs);

    function ringbuffer_index_increment(idx, len)
    {
	return (idx + 1) % len;
    }

      // TODO: we want some slow reconnect settings.
      // http://socket.io/docs/client-api/#manager(url:string,-opts:object)
      /*var connection_settings = {
          reconnection: true, // todo add more settings
      };*/

      /***
        sus/lit votes object: (not final)
          sus: pos int number of sus votes
          lit: same as sus, but represents lit
	  win: string indicating a winner ("sus" or "lit"). will be "" if no winner has been established yet

        misc stats that can be calculated from above object:
          pos: integer between -100 and 100, inclusive. represents the weight of all current votes in room. lit - sus
          num: positive integer. represents the total number of votes. lit + sus      
      ***/


function time_up()
{
    // todo some gui animation whatever
}

// todo indenting aghhh

      function second_tick()
      {
	  --time_remaining;
	  $('#time').text(time_remaining);

	  if (time_remaining === 0) {
	      stop_timer();
	      time_up();
	  }
	  else if (time_remaining == 1)
	      ;
	  else if (time_remaining == 2)
	      ;
	  else if (time_remaining == 3)
	      ;
	  else if (time_remaining < 10)
	      ;
	  else if (time_remaining < 20)
	      ;
      }

      function start_timer(seconds)
      {
	  if (typeof(seconds)==='undefined') seconds = 30; // this is how we do default arguments in js

	  if (timer === null )
	  {
	      time_remaining = Math.round(seconds); // global

	      // set gui timer to 30 seconds
              $('#time').text(time_remaining);
	      console.log('timer start, updating timer object');
              timer = setInterval(function(){
		      second_tick();
                    }, 1000);
	  }
      }

      function stop_timer()
      {
	  if ( timer !== null ) 
	      clearInterval(timer);
	  timer = null;

	  // also set gui timer to zero
	  time_remaining = 0;
	  $('#time').text("0")
      }

      function timer_expire()
      {
	  stop_timer();
      }

      // updates the votes meter and gif overlay based on the update message from server.
      function update_votes(data)
      {
          $('#sus_progress').val(data.sus);
          $('#sus_count').text((data.sus).toString());

          $('#lit_progress').val(data.lit);
          $('#lit_count').text((data.lit).toString());

	  if (data.sus > data.lit)
	  {
	      // sus is winning
	      $('#sus_count').addClass('bold');
	      $('#lit_count').removeClass('bold');

	      $('#gif').attr('src', 'assets/gif/' + gifs.sus[sus_gif_idx]);
	  }

	  if (data.sus < data.lit)
	  {
	      // lit is winning
	      $('#sus_count').removeClass('bold');
	      $('#lit_count').addClass('bold');

	      $('#gif').attr('src', 'assets/gif/' + gifs.lit[lit_gif_idx]);
	  }

	  if (data.sus == data.lit)
	  {
	      $('#gif').hide();//attr('src', ''); // sus
          }
	  else
	  {
	      $('#gif').show();//attr('src', ''); // sus
          }

	  if (data.win == "lit")
	      lit_win();
	  else if (data.win == "sus")
	      sus_win();
	  //else // transparency/opacity:
	  //    $('#gif').fadeTo("slow", Math.abs((data.sus - data.lit)/(data.sus + data.lit)));
      }

      // todo rename this end_voting
      function disable_voting()
      {
	  $('#sus_btn').prop("disabled", true);
	  $('#lit_btn').prop("disabled", true);
	  stop_timer();
      }

      function enable_voting(ms)
      {
	  if (typeof(ms)==='undefined') ms = 30000;

	  //enable buttons
	  $('#sus_btn').prop("disabled", false);
	  $('#lit_btn').prop("disabled", false);

	  //reset progress bars
	  $('#sus_progress').val(0);
	  $('#lit_progress').val(0);

	  // start timer
	  start_timer(ms/1000);

	  // gong
	  //sounds.gong.play();
      }

      function sus_win()
      {
	  console.log("ITS SUS... '>_>");
	  disable_voting();
	  $('#gif').attr('src', 'assets/itssus.png');
	  sounds.sus.play();
      }

      function lit_win()
      {
	  console.log("ITS LIT!! ^_^");
	  disable_voting();
	  $('#gif').attr('src', 'assets/itslit.png');
	  sounds.lit.play();
      }

      // function to send a vote to the server.
      function vote(sus_or_lit)
      {
          if (sus_or_lit === 'sus' || sus_or_lit === 'lit')
              socket.emit('vote', {id: my_id, its: sus_or_lit});
          else
              console.warn("unexpected vote cast:", sus_or_lit);
      }


function vote_in_progress(current_title, seconds_left)
{
    $('#song_title').text(current_title + ' (please wait for the next vote!)');
    start_timer(seconds_left);
}

// jquery's on-ready function: runs the anonymous function when 
// the page's DOM has been initialized and readied.
// sets up the socket
$(function(){

      // initialize with voting disabled
      disable_voting();

      // set some callbacks for the socket.

      // init message from server
      socket.on('hi', function (data) {
	  my_id = data.id;

	  // this handles ui when a vote is in progress
	  if (data.time_remaining !== 0)
	      vote_in_progress(data.title, data.time_remaining); // expects seconds not ms. title is the title of the track

          console.log(data);
          socket.emit('ready', { ready: my_id });
      });

      /* todo: use high-level controls like these to reduce network usage. */
      socket.on('next_vote', function (data) { // receive new song title and start a new voting session
	  console.log('Next vote. title = ' + data.title);
	  $('#song_title').text(data.title);
	  update_votes({ lit: 0, sus: 0, win: "" });
	  enable_voting(data.ms);
	  lit_gif_idx = ringbuffer_index_increment(lit_gif_idx, gifs.lit.length);
	  sus_gif_idx = ringbuffer_index_increment(sus_gif_idx, gifs.sus.length);
      }); 

      // should be unused by launch
      socket.on('title', function (data) { // receive new song title
          console.log('got new title:' + data);
	  $('#song_title').text(data);
      });

      socket.on('votes', function (data) { // receive current voting status
          console.log('Got vote status:');
          console.log(data);
          update_votes(data);
      });

      // should be unused by launch
      socket.on('enable', function (data) { // receive current voting status
          console.log('Enabling voting');
          enable_voting();
      });

      socket.on('disable', function (data) { // receive current voting status
          console.log('Disabling voting (actually, command is temporarliy bypassed. we should only disable initially, and when someone wins.)');
          //disable_voting();
      });

      // sus click handler
      $('#sus_btn').click(function(){
              console.log('sus pressed...');
              vote('sus');
          });

      // lit click handler
      $('#lit_btn').click(function(){
              console.log('lit pressed!!!');
              vote('lit');
          });
    }); // end of the jquery onready function
