#!/usr/local/bin/node
// server.node.js
// the complete litsus server
// runs the crowd app and control app backends
// based on example code from socket.io website
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
        updated: false // flag to keep track of stuff
    },
    _id = 0,
    state = "enabled",
    vote_timeout_ms = 3000,
    current_title = '',
    admin_port_num = 4808,
    crowd_port_num = 4220,

// object that contains our win case values and flags to control win cases.
// spread is the lead one vote category needs to gain over the other category to win.
// top is the max value needed to win.
    win_semantics = {
        top: 100,
        top_en: true,

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

// crowd app server setup
crowd.io.on('connection', function (socket) {

	// get an id for this IP address
	var id = map_ip_to_id(socket.request.connection.remoteAddress);

	// news and my other event came with the demo
	socket.emit('news', { hello: 'world', id: id});
	socket.on('my other event', function (data) {
		console.log(data);
	    });

	socket.on('vote', function (data) {
		console.log("got vote!");
		console.log(data);
		handle_vote(socket, data);
	    });
    });

// control app server setup
control.io.on('connection', function (socket) {

	// get an id for this IP address
	var ip = socket.request.connection.remoteAddress;
	socket.emit('init', { hello: 'world', state: state }); // todo more

	// todo
	socket.on('ok', function (data) {
		console.log('client at '+ ip +' ready');
	    });

	// refactor, for these 4,  maybe make the event named 'admin', and put the event info in the data?
	socket.on('reset', function (data) {
		console.log("RESET");
		reset();
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

	socket.on('win_semantics', function (data) {
		console.log("receiced updated win semantics");
		update_win_semantics();
	    });


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

// run the winner code body
function WINNER(sus_or_lit)
{ //todo
    console.log('WINNER REACHED');

    //tell clients who won via a winning votes message
    broadcast_votes(sus_or_lit);
    // stop counting votes
    disable();
}

// check if there's a winner
function winner_check()
{
    //spread check
    if (win_semantics.spread_en)
    {
	// we calculate the absolute difference like so
	var diff = votes.lit - votes.sus;

	// if the difference is gt_eq to the spread value, we declare a WINNER
	// if the difference is positive, lit won, sus otherwise.
        if (Math.abs(diff) >= win_semantics.spread)
        {
	    return WINNER( (diff>0) ? 'lit' : 'sus');
        }
    }

    //top check
    if (win_semantics.top_en)
    {
        if (votes.lit >= win_semantics.top)
        {
	    return WINNER('lit');
        }
        if (votes.sus >= win_semantics.top)
        {
	    return WINNER('sus');
        }
    }
}


// function for handling votes
function handle_vote(socket, data)
{
        if (state !== 'enabled')
	    return;

	// vote rate checking
	var ip = socket.request.connection.remoteAddress;
	if (ip in timeouts)
	{
	    //this ip has a timeout set: see if it is not time yet
	    var d = new Date();
	    if ((d.getTime() - timeouts[ip]) < vote_timeout_ms){
		console.log("discarding fast vote");
		return;
	    }
	}

	// finally, count the vote
	if (data.its === "sus")
	    votes.sus++;
	else if (data.its === "lit")
	    votes.lit++;
	votes.updated=true;
	set_timeout(ip);
	console.log("counting vote!!");
	winner_check();
}

// disable
function disable()
{
    console.log('disabling voting');
	state = 'disabled';
	crowd.io.sockets.emit('disable');
}

// enable
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
	votes.sus=votes.lit=0;
	votes.updated=true;
	timeouts.length=0; // clear the timeouts array
}

function broadcast_votes(winner_name)
{
    if (state === "enabled")
    {
        crowd.io.sockets.emit('votes', { sus: votes.sus, 
		                         lit: votes.lit,
		                         win: winner_name
		                       });
	votes.updated=false; // reset the update tracker
    }
}

function update_song_title(title)
{
    // tell all clients the new title
    current_title = title;
    crowd.io.sockets.emit('title', title);
}

// timer to broadcast votes to all clients
setInterval(function(){broadcast_votes("");}, 2500); //ms

(function(){
    console.log("SUS/LIT voting server is alive.");
    console.log("Crowd app is on port "+crowd_port_num);
    console.log("Control app is on port "+admin_port_num);
    console.log("Voting is currently DISABLED.");
    console.log("Have an admin set a song title and enable voting.");
})();

;
