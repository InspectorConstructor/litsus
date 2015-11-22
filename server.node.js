// example code from socket.io website

var fs = require('fs'); // filesystem

var app = require('http').createServer(handler);
var io = require('socket.io')(app);
app.listen(4220);

/* // todo: make two apps for this brave world
var crowd_app = require('http').createServer(handler);
var crowd_io = require('socket.io')(crowd_app);
crowd_app.listen(4220);

var control_app = require('http').createServer(handler);
var control_io = require('socket.io')(control_app);
control_app.listen(4228);
*/

// server state
var state = "enabled";

function handler (req, res) {
    console.log(req.url);

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

/* todo
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
*/

var clients=[];
var timeouts=[];

var id=0;
function next_id()
{
    return id++;
}

function map(ip)
{
    // see if client already registered
    if (ip in clients)
	return clients[ip];

    var id = next_id();
    clients[ip]=id;
    return id;
}

var votes = {
    sus: 0,
    lit: 0,
    updated: false // flag to keep track of stuff
};


// server setup
io.on('connection', function (socket) {

	// get an id for this IP address
	var id = map(socket.request.connection.remoteAddress);

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

	socket.on('reset', function (data) {
		console.log("got reset!");
		console.log(data);
		reset();
	    });

    });


function set_timeout(ip)
{
    var d = new Date();
    timeouts[ip] = d.getTime();
}

var vote_timeout_ms = 3000;

// function for handling votes
function handle_vote(socket, data)
{
        if (state !== 'enabled')
	    return;

	// vote rate checking
	var ip=socket.request.connection.remoteAddress;
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
}

// disable
function disable()
{
	state='disabled';
	io.sockets.emit('disable');
}

// enable
function enable()
{
	state='enabled';
	io.sockets.emit('enable');
}

// reset votes, title, and timeout
function reset()
{
	votes.sus=votes.lit=0;
	votes.updated=true;
	timeouts.length=0; // clear the timeouts array
}

function broadcast_votes()
{
    if (state === "enabled")
    {
        io.sockets.emit('votes', { pos: (votes.lit-votes.sus), 
		                        num: (votes.sus+votes.lit) });
	votes.updated=false; // reset the update tracker
    }
}

// timer to broadcast votes to all clients
setInterval(function(){broadcast_votes();}, 2500); //ms
