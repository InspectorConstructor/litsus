// socket_driver.js

      // define callbacks for socket event(s) //
      var  my_id='todo',
           current_track='',
	   websocket_server_address=window.location.href,
           limiter={
              limit: function(){}
           };

      /***
        sus/lit votes object: (not final)
          sus: pos int number of sus votes
          lit: same as sus, but represents lit

        misc stats that can be calculated from above object:
          pos: integer between -100 and 100, inclusive. represents the weight of all current votes in room. lit - sus
          num: positive integer. represents the total number of votes. lit + sus
      
      ***/

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
	  $('#sus_btn').prop("disabled", true);
	  $('#lit_btn').prop("disabled", true);

	  //reset progress bars
	  $('#sus_progress').val(0);
	  $('#lit_progress').val(0);
      }

      function sus_win()
      {
	  // todo
      }

      function lit_win()
      {
	  // todo
      }

      // function to send a vote to the server.
      function vote(sus_or_lit)
      {
          if (sus_or_lit === 'sus' || sus_or_lit === 'lit')
              socket.emit('vote', {id: my_id, its: sus_or_lit});
          else
              console.warn("unexpected vote cast:", sus_or_lit);
      }

      // set up our socket //

      // TODO connection settings we want some slow reconnect settings
      // http://socket.io/docs/client-api/#manager(url:string,-opts:object)
      /*var connection_settings = {
          reconnection: true, // todo add more settings
      };
      */

      // get a socket using socket.io call
      var socket = io(websocket_server_address);

      // finally, set up callbacks for the socket...  //
      // holy FUCK it's all event based this is :lit: //

      // set some callbacks for the socket.
      socket.on('news', function (data) { // demo code event. here for testing.
          console.log(data);
          socket.emit('my other event', { my: 'balls' });
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
