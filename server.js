'use strict';
const EventEmitter=require('events');
var fs=require('fs');
const WebSocket = require('ws');
const http=require('http');

const express = require('express');
const app = express();

app.use(express.static('public'));
const bserver=http.createServer(app);
const webPort =  5000;
 bserver.listen(webPort, function(){
    console.log('Web server start. http://localhost:' + webPort + '/');
	 console.log('Or webserver start on: ',process.env.HOSTNAME);
});
const wsServer=new WebSocket.Server({server:bserver});
//const obi =require('proxy-observe');
const mediasoup = require('mediasoup');
const RTCPeerConnection = mediasoup.webrtc.RTCPeerConnection;
const RTCSessionDescription = mediasoup.webrtc.RTCSessionDescription;
const roomOptions = require('./data/options').roomOptions;
const peerCapabilities = require('./data/options').peerCapabilities;
//const usePlanBFlag = true;

let selfId = null;
let soupRoom = null;
let Connections = new Array();
let clientIndex = 0;
let droom=new Map();
/*
Connections=Object.observe(Connections,(ch)=>{
console.log('changes: ', ch)
})
*/
// ----- mediasoup ----
var boom=new EventEmitter();
//var ssl_options={key:fss.readFileSync('server.key'),cert:fss.readFileSync('server.crt')};

let server = mediasoup.Server({
	                         logLevel:"debug",
	                         logTags:["info","ice","dtls","rtp","srtp"/*,"rtcp","rtx","rbe"*/],
							 rtcIPv4:true,
							 rtcIPv6:false,
							 rtcAnnouncedIPv4:null,
							 rtcAnnouncedIPv6:null,
							 rtcMinPort:40000,rtcMaxPort:49999,
							 dtlsCertificateFile:"keys/mycert.pem",
							 dtlsPrivateKeyFile:"keys/mykey.pem"
							  });
server.on('newroom',(r)=>{
console.log('new room: ',r.id);
boom.emit('fuck',{room_id:r.id});
});
server.on('close',(er)=>{
console.log('closing the mediasoup server');
	//process.exit(0);
	if(er){console.log(er);process.exit(1);}
})
process.on('SIGTERM',()=>{
console.log('sigterminated');
server.close();
	ptocess.exit();
})
process.on('SIGINT',()=>{
console.log('sigint fired');
	server.close();
	process.exit();
})
/*
server.createRoom(roomOptions)
.then((room) => {
  soupRoom = room;
  console.log('server.createRoom() succeeded');
})
.catch((err) => console.error('server.createRoom() ERROR', err)
);
*/
function croom(mn){
return new Promise(function(res,rej){
	server.createRoom(roomOptions)
.then((room) => {
		console.log('room.roomId: ',room.id);
		
  droom.set(mn,room);
  console.log('server.createRoom() succeeded');
		//console.log('souproom: ',soupRoom.get(0));
		//console.log('roomId 2: ',soupRoom.get(mn).id);
		//room.dump().then(f=>{console.log('room dump: ',f)}).catch(e=>{console.log(e)})
boom.emit('genauroom',{roomid:room.id,roomname:mn,type:'genaurum'});
		res('ok');
})
.catch((err) => {console.error('server.createRoom() ERROR', err.name,' : ',err.message);
				 rej(err);
				}
);
							})
}

// --- websocket server ---
function getId(ws) {
  if (ws.additionalId) {
    return ws.additionalId;
  }
  else {
    clientIndex++;
    ws.additionalId = 'member_' + clientIndex;
    return ws.additionalId;
  }
}

function getClientCount() {
  return wsServer.clients.size;
}



wsServer.on('connection', function connection(ws) {
  console.log('client connected. id=' + getId(ws) + '  , total clients=' + getClientCount());
	function onfuck(dob){
	console.log('DOB: ',dob);
console.log('CLIENT SEND');
	dob.type="roomcreated";
	dob.toclient=getId(ws);
if(ws.readyState===1)ws.send(JSON.stringify(dob));
	}
	
function ongenauroom(bob){
console.log('BOB: ',bob);
console.log('CLIENT 2 SEND');
bob.toclient=getId(ws);
if(ws.readyState===1)ws.send(JSON.stringify(bob));
}
	
boom.on('fuck',onfuck);
boom.on('genauroom',ongenauroom)
	
  ws.on('close', function () {
 console.log('client closed. id=' + getId(ws) + '  , total clients=' + getClientCount());
 cleanUpPeer(ws);
	  boom.removeListener('genauroom',ongenauroom);
	  boom.removeListener('fuck', onfuck);
if(ws.owner){
console.log('OWNER!!!!!');
var wes=droom.get(ws.owner);
if(wes){
console.log('WES!!!!!for a room named: ',ws.owner)

droom.get(ws.owner).on('close',e=>{
			droom.delete(ws.owner);
			console.log('ROOM CLOSED');
			console.log('ROOM SIZE:',droom.size);
		  if(e){
			  console.log('error closing the room: ',e);
			   }
			  })
droom.get(ws.owner).close();
}				  
				  }
  });
  ws.on('error', function(err) {
    console.error('ERROR:', err);
  });
  ws.on('message', function incoming(data) {
    const inMessage = JSON.parse(data);
    const id = getId(ws);
    console.log('received id=%s type=%s',  id, inMessage.type);
if(inMessage.type=='createroom'){
	if(inMessage.owner=='true');
console.log('owner is true');
	if(droom.has(inMessage.roomname)){
		
	   console.log('Schoo gibts this room by name: ',inMessage.roomname)
	   console.log(' ...skiping');
	   }else{
	   console.log('creating a room for id=',id);
croom(inMessage.roomname).then((da)=>{
console.log('da: ',da);
	ws.owner=inMessage.roomname;
	let message={type:"rooming", sendto:id,success:"trying to success"};
	//senback(ws,message);
}).catch(e=>{
	console.log('error room creating: ',e);
	delete ws.owner;
	//sendback(ws,{type:"rooming",sendto:id,success:"trying to fail"})
})	
		}
}else if (inMessage.type === 'call') {
      console.log('got call from id=' + id);
      let message = { sendto: id, type: 'response' };
      console.log('send response to id=' + id);
const downOnlyRequested=false;
	preparePeer(ws, inMessage, downOnlyRequested);	
      //sendback(ws, message);
    }else if(inMessage.type==='call_downstream'){
	const downOnlyRequested=true;
		preparePeer(ws,inMessage,downOnlyRequested);
	}
    else if (inMessage.type === 'offer') {
      console.log('got Offer from id=' + id);
		console.log('must not got offer.');
     // handleOffer(ws, inMessage);
    }
    else if (inMessage.type === 'answer') {
      console.log('got Answer from id=' + id);
      handleAnswer(ws, inMessage);
    }
    else if (inMessage.type === 'candidate') {
      console.error('MUST NOT got candidate');
    }
    else if (inMessage.type === 'bye') {
      cleanUpPeer(ws, inMessage.roomname);
    }else if(inMessage.type==='removeroom'){
	if(inMessage.owner==='true'){
	console.log('closing a room: ',inMessage.roomname);
	let vid=droom.get(inMessage.roomname);
	if(vid){
		droom.get(inMessage.roomname).on('close',e=>{
			droom.delete(inMessage.roomname);
			console.log('ROOM CLOSED');
			console.log('ROOM SIZE:',droom.size);
			sendback(ws,{type:'goodbyeroom',roomname:inMessage.roomname,vid:vid.id});
		  if(e){console.log(e);
		sendback(ws,{type:'error',error:e,roomname:inMessage.roomname})
			   }
			  })
		droom.get(inMessage.roomname).close();
		console.log('ROOM SIZE:',droom.size);
		}
	}	
	}
  });

  sendback(ws, { type: 'welcome' });
});

function sendback(ws, message) {
  let str = JSON.stringify(message);
  ws.send(str);
}

function preparePeer(ws, message, downOnly){
const id=getId(ws);
const planb=message.planb;
const capabilitySDP=message.capability;
	//let peer=soupRoom.Peer(id);
	console.log('MESSAGE.ROOMNAME: ',message.roomname);
	let peer=droom.get(message.roomname).Peer(id);
	let peerconnection=new RTCPeerConnection({peer:peer,usePlanB:planb});
	console.log('--- create rtcpeerconnection --');
	console.log('-- peers in the room = ',/*soupRoom*/droom.get(message.roomname).peers.length);
	peerconnection.on('close', err=>{console.log('peerconnection closed ');
									if(err)console.log(err);});
	peerconnection.on('signalingstatechange',()=>console.log('sate ',peerconnection.signalingState));
	peerconnection.on('negotiationneeded',()=>{console.log('negotiationneeded id: ',id);
											   sendOffer(ws,peerconnection,downOnly);});
	peerconnection.setCapabilities(capabilitySDP).
	then(()=>{
	console.log('peer.setcapabilities() ok');
		addPeerConnection(id,peerconnection);
		sendOffer(ws,peerconnection);
	}).catch(err=>{
	console.log('peer.setcapabilities() err: ',err);
		peerconnection.close();
	})
}

function sendOffer(ws,peerconnection,downOnly){
const id=getId(ws);
	console.log('send offer to id= ',id);
	let offerOption={offerToReceiveAudio:1,offerToReceiveVideo:1};
	if(downOnly){
	offerOption.offerToReceiveAudio=0;
    offerOption.offerToReceiveVideo=0;
	}
	peerconnection.createOffer(offerOption)
	.then(desc=>{return peerconnection.setLocalDescription(desc)})
	.then(()=>{
	dumpPeer(peerconnection.peer,'peer.dump after createoffer')
	sendSDP(ws,peerconnection.localDescription)
	}).catch(err=>{console.log('error handling sdp offer to participant: ',err)
				  peerconnection.reset()
				  peerconnection.close()
				  deletePeerConnection(id);
				  })
}

function handleOffer(ws, message) {
  const id = getId(ws);
  const option = { usePlanB: message.planb };
      
  let desc = new RTCSessionDescription({
    type : "offer",
    sdp  : message.sdp
  });
  console.log('RTCSessionDescription --');
	var mediapeer=soupRoom.Peer("Alice");
  let peerconnection = new RTCPeerConnection({peer:mediapeer, id:id, usePlanB:message.usePlanB});
	peerconnection.setCapabilities(message.sdp).then(()=>{
	sendsdpoffer(peerconnection);
	}).catch(error=>{console.log('err: ',error);peerconnection.close()})
	
  peerconnection.on('close', function(err) {
    console.log('-- PeerConnection.closed');
	  if(err)console.log(err)
  });
  peerconnection.on('signalingstatechange', function() {
    console.log('-- PeerConnection.signalingstatechanged, state=' + peerconnection.signalingState);
  });      
  
	peerconnection.on('negotiationneeded',()=>{
					  sendsdpoffer(peerconnection);
					  })
  console.log('--- create RTCPeerConnection --');
  console.log('-- peers in the room = ' + soupRoom.peers.length);

  addPeerConnection(id, peerconnection);
  function sendsdpoffer(p){
  p.createOffer({offerToReceiveAudio:1,offerToReceiveVideo:1}).then(desc=>{
  return p.setLocalDescription(desc);
  }).then(()=>{
  return sendSDP(ws,{offer:p.localDescription.serialize()})
  }).then(data=>{
 // return p.setRemoteDescription(data.answer);
  }).catch(error=>{console.log('err2: ',error)})
  }
  
   
}

function handleAnswer(ws, message) {
  const id = getId(ws);
  let peerconnection = getPeerConnection(id);
  if (! peerconnection) {
    console.log('WARN: connection not found. id=', id);
    return;
  }

  let desc = new RTCSessionDescription({
    type : "answer",
    sdp  : message.sdp
  });
  
  peerconnection.setRemoteDescription(desc)
  .then( function() {
    console.log('setRemoteDescription for Answer OK id=' + id);
    console.log('-- peers in the room = ' + soupRoom.peers.length);

    dumpPeer(peerconnection.peer, 'peer.dump after setRemoteDescription(re-answer):');
  })
  .catch( (err) => {
    console.log('setRemoteDescription for Answer ERROR:', err)
  });
}

function dumpPeer(peer, caption) {
  /*-- for debug --
  peer.dump()
  .then((obj) => {
    console.log(caption, obj)
  });
  ---*/

  console.log(caption + ' transports=%d receivers=%d senders=%d',
    peer.transports.length, peer.rtpReceivers.length, peer.rtpSenders.length
  );
}


function addPeerConnection(id, pc) {
  Connections[id] = pc;
}

function getPeerConnection(id) {
  const pc = Connections[id];
  return pc
}

function deletePeerConnection(id) {
  delete Connections[id];  
}

function cleanUpPeer(ws,name) {
  const id = getId(ws);
  let peerconnection = getPeerConnection(id);
  if (! peerconnection) {
    console.log('WARN: cleanUpPeer(id) , connection not found. id=', id);
    return;
  }
  
  console.log('PeerConnection close. id=' + id);
  peerconnection.close();
	//droom.get.delete(name);
  deletePeerConnection(id);

  console.log('-- peers in the room = ' + droom.get(name).peers.length);
}

function getRoomName() {
  var room = 'soup';
  if (process.argv.length > 2) {
    room = process.argv[2];
  }
  return room;
}

function sendSDP(ws, sessionDescription) {
  const id = getId(ws);
  let message = { sendto: id, type: sessionDescription.type, sdp: sessionDescription.sdp };
  console.log('--- sending sdp ---');
  //console.log(message);
  console.log('sendto:' + message.sendto + '   type:' + message.type);

  // send via websocket
  sendback(ws, message);
}


