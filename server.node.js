#!/usr/local/bin/node
// server.node.js
// the complete litsus server
// runs the crowd app and control app backends
// adapted from the example code from socket.io website
;console.log('starting up...');
// declarations
var fs = require('fs'), // filesystem
    crowd = {}, // crowd is an object that contains the crowd app stuff
    control = {}, // control is an object that contains the admin app stuff
    clients=[], // contains IP to ID mappings
    timeouts=[], // contains IP to timeout mappings
    votes = {
        sus: 0,
        lit: 0,
        updated: false // flag to keep track of stuff (...unused?)
    },
    _id = 0,
    state = "disabled",
    vote_timeout_ms = 8000,
    current_title = '',
    admin_port_num = 4808,
    crowd_port_num = 4220,
    vote_timer = null, // will hold the timer returned by setTimeout or null
    timer_ms = 30050, // 30 seconds, plus 50 ms as a tiny window for initial network delay

// object that contains our win case values and flags to control win cases.
// spread is the lead one vote category needs to gain over the other category to win.
// top is the max value needed to win.
    win_semantics = {
        top: 100,
        top_en: false,

        spread: 60,
        spread_en: false
    };

// protect our original object structure
Object.seal(win_semantics);

// object sealing becaues it sounds cool
Object.seal(votes);

// crowd application
crowd.app = require('http').createServer(crowd_handler);
crowd.io = require('socket.io')(crowd.app);

crowd.app.on('clientError', (e) => {
	console.log(`Got error: ${e.message}`);
    });

crowd.app.listen(crowd_port_num);

// control application
control.app = require('http').createServer(control_handler);
control.io = require('socket.io')(control.app);
control.app.listen(admin_port_num);


// called when the timer reaches zero
// not called if the timer is cancelled before zero
function timer_expire()
{
    stop_timer();

    // pick a winner
    if ( votes.lit == votes.sus )
        TIE();
    else
        WINNER((votes.lit > votes.sus) ? "lit" : "sus");
}

var start_timestamp = null;

function stop_timer()
{
    if ( vote_timer !== null )
    {
        clearTimeout(vote_timer);
	vote_timer = null;
	start_timestamp = null;
    }
}

function start_timer()
{
    if ( vote_timer === null )
    {
	vote_timer = setTimeout(function(){ timer_expire(); }, timer_ms);
	var d = new Date();
	start_timestamp = d.getTime();
    }
}

// http server request handler for crowd app
function crowd_handler (req, res) {
    var file;
    if ( req.url === '/')
	file = __dirname + '/index.html';
    else 
	file = __dirname + req.url;

    fs.readFile(file, function (err, data) {
	if (err) {
	    res.writeHead(500);
	    return res.end('Server Error: failed loading index.html');
	}

	res.writeHead(200);
	res.end(data);
    });
}

// http server request handler for control app
function control_handler (req, res) {
    fs.readFile(__dirname + '/control.html',
    function (err, data) {
	if (err) {
	    res.writeHead(500);
	    return res.end('Server Error: failed loading control.html');
	}

	// todo mime types
	res.writeHead(200);
	res.end(data);
    });
}

function next_id(){ return _id++ ;}

function map_ip_to_id(ip)
{
    // see if client already registered
    if (ip in clients)
	return clients[ip];

    var id = next_id();
    clients[ip]=id;
    return id;
}

// return remaining time in seconds
function getReminingTime()
{
    if (start_timestamp !== null)
    {
	var now = (new Date()).getTime();
	var sec_diff = (start_timestamp - now) / 1000;
	return 30 + sec_diff ; // 30 is hardcoded number of seconds per vote session
    }
    else
	return 0;
}

// crowd app server setup
crowd.io.on('connection', function (socket) {

	// get an id for this IP address
	var id = map_ip_to_id(socket.request.connection.remoteAddress);

	// news and my other event came with the demo
	socket.emit('hi', { id: id, 
		    time_remaining: getReminingTime(),
		    title: current_title
		    });

	socket.on('ready', function (data) {
		;//console.log(data);
	    });

	socket.on('vote', function (data) {
		if (state === "enabled") {
		    //console.log("got vote!");
		    //console.log(data);
		    handle_vote(socket, data);
		} else { 
		    ;//console.log("ignoring vote (voting disabled right now)"); 
		}
	    });
    });

// control app server setup
control.io.on('connection', function (socket) {

	// get an id for this IP address
	var ip = socket.request.connection.remoteAddress;
	socket.emit('init', { hello: 'world', state: state }); // todo more

	// todo
	socket.on('ok', function (data) {
		console.log('Admin  at '+ ip +' ready');
	    });

	// refactor, for these 4,  maybe make the event named 'admin', and put the event info in the data?
	socket.on('reset', function (data) {
		console.log("RESET");
		reset();
	    });

	socket.on('next_vote', function (data) { // data here is just a string representing the next song title.
		console.log("Starting next vote. song title: " + data);
		next_vote(data);
	    });

	socket.on('title', function (data) { // data here is just a string with the title in it.
		console.log("title update: " + data);
		update_song_title(data);
	    });

	socket.on('enable', function (data) {
		console.log("VOTING ENABLE");
		enable();
	    });

	socket.on('disable', function (data) {
		console.log("VOTING DISABLE");
		disable();
	    });

	socket.on('WINNER', function (data) { // message to troll everyone and test stuff quickly
		console.log("force a winner: ", data);
		WINNER(data);
	    });

	/*
	socket.on('win_semantics', function (data) {
		console.log("receiced updated win semantics");
		update_win_semantics();
	    });
	*/

    });

// I am being overly cautious here for no reason....
// been writing too much C lately and this all just feels too loose
function update_win_semantics(win_semantics_obj)
{
    if (win_semantics_obj === null || typeof win_semantics_obj !== 'object')
	{
	    console.warn("non-object parameter passed to update_win_semantics()");
	    return;
	}

    //safely update the values using the server's sealed object.
    for (var prop in win_semantics)
	{
	    if (win_semantics_obj.hasOwnProperty(prop))
		{
		    win_semantics[prop] = win_semantics_obj[prop];
		}
	}
}

function set_timeout(ip)
{
    var d = new Date();
    timeouts[ip] = d.getTime();
}

function log_vote(ip, lit_or_sus)
{
    var d = new Date();
    timeouts[ip] = {time:d.getTime(), vote:lit_or_sus};
}

function TIE()
{
    //todo
    WINNER('lit'); // lit is temporary tiebreaker
}

function WINNER(sus_or_lit)
{
    console.log('WINNER REACHED: ', sus_or_lit);

    //tell clients who won via a winning votes message
    broadcast_votes(sus_or_lit);

    // stop counting votes
    disable();
}

// check if there's a winner
// return true if winner, fale otherwise
function winner_check()
{
    // this code is not used anymore, but here in case we think of using it again
    return false;

    //spread check
    /* not doing spread.
    if (win_semantics.spread_en)
    {
	// we calculate the absolute difference like so
	var diff = votes.lit - votes.sus;

	// if the difference is gt_eq to the spread value, we declare a WINNER
	// if the difference is positive, lit won, sus otherwise.
        if (Math.abs(diff) >= win_semantics.spread)
        {
	    WINNER( (diff>0) ? 'lit' : 'sus');
	    return true;
        }
    } */

    //top check
    if (win_semantics.top_en)
    {
        if (votes.lit >= win_semantics.top)
        {
	    WINNER('lit');
	    return true;
        }
        if (votes.sus >= win_semantics.top)
        {
	    WINNER('sus');
	    return true;
        }
    }

    return false;
}


// function to actually handle the message
function count_vote(ip, data)
{
    // count the vote
    if (data.its === "sus")
    {
	votes.sus++;
	log_vote(ip, "sus");
	console.log("sus vote " + ip);
    }
    else if (data.its === "lit")
    {
	votes.lit++;
	log_vote(ip, "lit");
	console.log("lit vote " + ip);
    }
    else
    {
	console.log("vote other than sus or lit received.... how sus. here it is: ");
	console.log(data);
    }

    votes.updated = true;

    return winner_check();
}

// vote message handler
function handle_vote(socket, data)
{
        if (state !== 'enabled')
	    return;

	var didSomethingWin = false;

	// vote rate limiter
	var ip = socket.request.connection.remoteAddress;

	// check if client at this ip voted this round
	if (ip in timeouts)
	{ 
	    var d = new Date();

	    // see if it's been long enough for it to waffle
	    if ((d.getTime() - timeouts[ip].time) >= vote_timeout_ms)
	    {
		// check if they are actually waffling
		if (data.its != timeouts[ip].vote)
	        {
		    votes[timeouts[ip].vote]--; // remove this ip's previous vote
		    didSomethingWin = count_vote(ip, data); // apply the new vote from this ip
		}
	    }
	}
	else
	{ // client at this ip has not voted this round
	    didSomethingWin = count_vote(ip, data);
	}

    if (! didSomethingWin)
    {
	// send vote tallies to the person who voted. this makes the system look responsive.
	socket.emit('votes', { sus: votes.sus,
		               lit: votes.lit,
		               win: "" });
    }
}

// begins a new voting session
function next_vote(song_title)
{
    if (state === "disabled") // accidential mid re-enable protection
    { 
	// start timers
	reset();
	enable_vote_broadcast();
	start_timer();
	state = 'enabled';
	current_title = song_title;

	crowd.io.sockets.emit('next_vote', song_title); // tell clients there's a new sherrif in town #fired
    }
}

// disable voting
function disable()
{
    stop_timer();
    disable_vote_broadcast();
    console.log('disabling voting');
    state = 'disabled';
    crowd.io.sockets.emit('disable');
}

// enable voting
function enable()
{
    console.log('enabling voting');
    state = 'enabled';
    crowd.io.sockets.emit('enable');
}

// reset votes, title, and timeout
function reset()
{
    console.log('resetting');
    votes.sus = votes.lit = 0;
    votes.updated = true;
    timeouts=[]; // clear the timeouts array
}

function broadcast_votes(winner_name)
{
    if (state === "enabled")
    {
	var vote_pkt = {
                         sus: votes.sus, 
                         lit: votes.lit,
                         win: winner_name
                       };

        crowd.io.sockets.emit('votes', vote_pkt);
        control.io.sockets.emit('votes', vote_pkt);
	votes.updated = false; // reset the update tracker
    }
}

function update_song_title(title)
{
    // tell all clients the new title
    current_title = title;
    crowd.io.sockets.emit('title', title);
}

// timer to broadcast votes to all clients
var broadcast_timer = null;

function enable_vote_broadcast(){
    broadcast_timer = setInterval(function(){broadcast_votes("");}, 2500); //ms
}

function disable_vote_broadcast(){ 
    if (broadcast_timer !== null ) {
	clearInterval(broadcast_timer); //ms
	broadcast_timer = null;
    }
}


(function(){
    console.log("SUS/LIT voting server is alive.");
    console.log("Crowd app is on port " + crowd_port_num);
    console.log("Control app is on port " + admin_port_num);
    console.log("Voting is currently DISABLED.");
    console.log("Have an admin set a song title and enable voting.");
})();

;
