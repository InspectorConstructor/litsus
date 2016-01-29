// socket_driver.js

// todo make this more intimidating
    console.log('               __     __           __                           __');
    console.log('   ____ ____  / /_   / /___  _____/ /_     ____  ___  _________/ /');
    console.log('  / __ `/ _ \/ __/  / / __ \/ ___/ __/    / __ \/ _ \/ ___/ __  / ');
    console.log(' / /_/ /  __/ /_   / / /_/ (__  ) /__    / / / /  __/ /  / /_/ /  ');
    console.log(' \__, /\___/\__/  /_/\____/____/\__( )  /_/ /_/\___/_/   \__,_/   ');
    console.log('/____/                             |/                             ');

      // define callbacks for socket event(s)
      var my_id='todo',
          current_track='',
	  websocket_server_address=window.location.href,
	  timer=null,
          limiter={
              limit: function(){}
          },
	  time_remaining=0, // ms
	  sounds={
	      lit: new Audio("assets/lit_airhorn.mp3"),
	      sus: new Audio("assets/sus_airhorn.mp3"),
	      gong: new Audio("assets/gong.mp3"),
	  },
	  gifs = { // todo fill this with gif filenames
	      lit: [],
	      sus: []
	  }

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

      function second_tick()
      {
	  --time_remaining;
	  //todo decrement gui timer by one

	  $('#time').text(time_remaining);

	  if (time_remaining == 0) {
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

      function start_timer()
      {
	  if (timer === null )
	  {
              time_remaining=30;

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
      }

      function timer_expire()
      {
	  stop_timer();
      }

      // updates the votes meter and gif overlay based on the update message from server.
      // as of now, also accepts
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

	      $('#gif').attr('src', 'assets/gif/wookie.gif');
	  }

	  if (data.sus < data.lit)
	  {
	      // lit is winning
	      $('#sus_count').removeClass('bold');
	      $('#lit_count').addClass('bold');

	      $('#gif').attr('src', 'assets/gif/pikachu.gif');
	  }

	  if (data.sus == data.lit)
	  {
	      $('#gif').attr('src', ''); // sus
          }

	  if (data.win == "lit")
	      lit_win();
	  else if (data.win == "sus")
	      sus_win();
	  else
	      $('#gif').fadeTo("slow", Math.abs((data.sus - data.lit)/(data.sus + data.lit)));
      }

      function disable_voting()
      {
	  $('#sus_btn').prop("disabled", true);
	  $('#lit_btn').prop("disabled", true);
      }

      function enable_voting()
      {
	  //enable buttons
	  $('#sus_btn').prop("disabled", false);
	  $('#lit_btn').prop("disabled", false);

	  //reset progress bars
	  $('#sus_progress').val(0);
	  $('#lit_progress').val(0);

	  // start timer
	  start_timer();

	  // gong
	  sounds.gong.play();
      }

      function sus_win()
      {
	  disable_voting();
	  $('#gif').attr('src', 'assets/png/itssus.png');
	  sounds.sus.play();
      }

      function lit_win()
      {
	  disable_voting();
	  $('#gif').attr('src', 'assets/png/itslit.png');
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

      // set up our socket

      // TODO connection settings we want some slow reconnect settings
      // http://socket.io/docs/client-api/#manager(url:string,-opts:object)
      /*var connection_settings = {
          reconnection: true, // todo add more settings
      };
      */

      // get a socket using socket.io call
      var socket = io(websocket_server_address);

      // set some callbacks for the socket.
      socket.on('hi', function (data) { // demo code event. here for testing.
	  my_id = data.id;
          console.log(data);
          socket.emit('ready', { ready: my_id });
      });

      socket.on('title', function (data) { // receive new song title
          console.log('got new title');
          console.log(data);
	  $('#song_title').text(data);
      });

      socket.on('votes', function (data) { // receive current voting status
          console.log('Got vote status:');
          console.log(data);
          update_votes(data);
      });

      socket.on('enable', function (data) { // receive current voting status
          console.log('Enabling voting');
          enable_voting();
      });

      socket.on('disable', function (data) { // receive current voting status
          console.log('Disabling voting (actually, command is temporarliy bypassed');
          //disable_voting();
      });

      // jquery's on-ready function thinger: runs the anonymous function when 
      // the page's DOM has been initialized and readied.
      $(function(){
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
      });
