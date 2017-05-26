'use strict';
const EventEmitter=require('events');
const WebSocket = require('ws');
const http=require('http');

const express = require('express');
const app = express();

app.use(express.static('public2'));
const bserver=http.createServer(app);
const webPort = 5000;
 bserver.listen(webPort, function(){
    console.log('Web server start. http://localhost:' + webPort + '/');
});
const wss=new WebSocket.Server({server:bserver});
//const obi =require('proxy-observe');
const mediasoup = require('mediasoup');
const RTCPeerConnection = mediasoup.webrtc.RTCPeerConnection;
const RTCSessionDescription = mediasoup.webrtc.RTCSessionDescription;
const roomOptions = require('./data/options').roomOptions;
const peerCapabilities = require('./data/options').peerCapabilities;
var boom=new EventEmitter();
let server = mediasoup.Server({logLevel:"debug"});
server.on('newroom',(r)=>{
console.log('new room: ',r.id);
boom.emit('fuck',{room_id:r.id});
});
server.on('close',(er)=>{
console.log('closing the mediasoup server');
if(er){console.log(er);}
})

process.on('SIGINT',()=>{
console.log('sigint fired');
server.close();
process.exit();
})

let Connections = new Array();
//let clientIndex = 0;
let droom=new Map();
var nextId=Date.now();

function croom(mn){
return new Promise(function(res,rej){
server.createRoom(roomOptions)
.then((room) => {
console.log('room.roomId: ',room.id);
droom.set(mn,room);
console.log('server.createRoom() succeeded');
//room.dump().then(f=>{console.log('room dump: ',f)}).catch(e=>{console.log(e)})
boom.emit('genauroom',{roomid:room.id,roomname:mn,type:'genaurum'});
res('ok');
})
.catch((err) => {
console.error('server.createRoom() ERROR', err.name,' : ',err.message);
rej(err);
});})}
	
	function sendtooneuser(bs,target,mstring){
	for(let i of wss.clients){
	if(i.upgradeReq.url===bs.upgradeReq.url){
	if(i && i.readyState===WebSocket.OPEN){
	if(i.username===target){
	console.log('i.username: ',i.username);
	i.send(mstring);
	break;
	}
	}}
	}}
	
	function getconnectionforid( bs, id){
	var connect=null;
		console.log('FUCK: ',bs.upgradeReq.url);
		for(let i of wss.clients){
		if(i.upgradeReq.url===bs.upgradeReq.url){	
		if(i.clientId===id){
		connect=i;
			break;
		}
		}}
		return connect;
	}
	
		function makeuserlistmessage(bs){
		var userlistmsg={type:"userlist", users:[]};
			wss.clients.forEach(c=>{
			if(c.upgradeReq.url===bs.upgradeReq.url){
			if(c && c.readyState===WebSocket.OPEN){
			userlistmsg.users.push({username:c.username,owner:c.owner});
				}}
			})
			return userlistmsg;
		}
		
		function senduserlisttoall(bs){
		var userlistmsg=makeuserlistmessage(bs);
			var userlistmsgstr=JSON.stringify(userlistmsg);
			wss.clients.forEach(c=>{
			if(c.upgradeReq.url===bs.upgradeReq.url){
			if(c && c.readyState===WebSocket.OPEN){
			c.send(userlistmsgstr)
			}}
			});
		}

wss.on('connection',ws=>{
console.log('websocket connected: ', ws.upgradeReq.url);
function oncreateroom(dob){
console.log('DOB: ',dob);
console.log('FUCK FUCK FUCK');
console.log('CLIENT SEND1 to:', ws.clientId);
dob.type="roomcreated";
dob.toclient=ws.clientId;
//console.log('WS>OPENED?????:',ws.readyState);
if(ws.readyState===1)ws.send(JSON.stringify(dob));
	}	
function ongenauroom(bob){
console.log('BOB: ',bob);
console.log('wss.clients: ',wss.clients.size);
//wss.clients.forEach((client)=>{
//if(client.readyState===WebSocket.OPEN){
console.log('CLIENT 2 SEND');
//console.log('ws.clientId: ',client.clientId)
//bob.toclient=client.clientId;
bob.toclient=ws.clientId;
if(ws.readyState===1)ws.send(JSON.stringify(bob));
//client.send(JSON.stringify(bob));
//	}
//})
}
function onroomremove(dib){
console.log('onroomremove: ',dib);
dib.toclient=ws.clientId;
if(ws.readyState==1)ws.send(JSON.stringify(dib))
}
boom.on('fuck', oncreateroom);
boom.on('genauroom', ongenauroom)
boom.on('roomremove', onroomremove)
ws.clientId=nextId;
nextId++;
var msg={type:"id", id:ws.clientId};
ws.send(JSON.stringify(msg));
ws.on('error',e=>console.log('err: ',err))

ws.on('message', message=>{
//console.log('wss.clients.length: ',ws.clients.size());
console.log('Message: ', message);
var sendtoclients=true;
try{
msg=JSON.parse(message);}catch(e){console.log('error json parse');}
var connect=getconnectionforid(ws,msg.id);
//console.log('connect: ',connect);
		
if(msg.type=="message"){
	console.log('MESSAGE???')
if(connect){
msg.name=connect.username;
}
msg.text=msg.text;
}else if(msg.type=="username"){
connect.username=msg.name;
connect.owner=msg.owner;
senduserlisttoall(ws);
	
sendtoclients=false;
}else if(msg.type=="createroom"){
console.log('CREATING ROOM');
	
if(msg.owner=='true'){
console.log('owner is true');
if(droom.has(msg.roomname)){
console.log('Schoo gibts this room by name: ',msg.roomname)
console.log(' ...skiping');
}else{
console.log('creating a room for id=',ws.clientId);
croom(msg.roomname).then((da)=>{
console.log('da: ',da);
ws.owner=msg.roomname;

}).catch(e=>{
console.log('error room creating: ',e);
delete ws.owner;
})	
}	
}
sendtoclients=false;
}else if(msg.type=="call"){
console.log('got call from id=' + ws.clientId);
const downOnlyRequested=false;
preparePeer(ws, msg, downOnlyRequested);
sendtoclients=false;
}else if(msg.type=="call_downstream"){
const downOnlyRequested=true;
preparePeer(ws, msg,downOnlyRequested);
sendtoclients=false;
}else if(msg.type=="offer"){
		console.log('got Offer from id=');
		console.log('must not got offer.');
}else if(msg.type=="answer"){
	console.log('got Answer from id=' + ws.clientId);
    handleAnswer(ws, msg);
}else if(msg.type=="bye"){
	cleanUpPeer(ws, msg.roomname);
	sendtoclients=false;
}else if(msg.type=="candidate"){
   console.log('MUST NOT got candidate');
}else if(msg.type=="removeroom"){
	if(msg.owner==='true'){
	console.log('closing a room: ',msg.roomname);
	let vid=droom.get(msg.roomname);
	if(vid){
	droom.get(msg.roomname).on('close',e=>{
	droom.delete(msg.roomname);
	console.log('ROOM CLOSED');
	console.log('ROOM SIZE:',droom.size);
	//sendback(ws,{type:'goodbyeroom',roomname:msg.roomname,vid:vid.id});
	ws.send(JSON.stringify({type:'goodbyeroom',roomname:msg.roomname,vid:vid.id}));
	boom.emit('roomremove',{type:'roomremove',roomname:msg.roomname,vid:vid.id})
	if(e){
	console.log(e);
	sendback(ws,{type:'error',error:e,roomname:msg.roomname})
	}
	})
	droom.get(msg.roomname).close();
	console.log('ROOM SIZE:',droom.size);
	}
	}
	
	sendtoclients=false;
}else{console.log('unknown type: ',msg.type)}

	
if(sendtoclients){
var msgstring=JSON.stringify(msg);
if(msg.target && msg.target !==undefined && msg.target.length !==0){
sendtooneuser(ws,msg.target, msgstring);
}else{
wss.clients.forEach(c=>{
if(c.upgradeReq.url===ws.upgradeReq.url){
if(c && c.readyState===WebSocket.OPEN){c.send(msgstring)}
}
})}
}
})

ws.on('close',()=>{
console.log('websocket closed');
console.log('client closed. id=' + ws.clientId + '  , total clients=' + wss.clients.size);
cleanUpPeer(ws);

boom.removeListener('genauroom', ongenauroom);
boom.removeListener('fuck', oncreateroom);
boom.removeListener('roomremove', onroomremove);

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
})

})

function sendback(ws, message) {
let str = JSON.stringify(message);
ws.send(str);
}

function preparePeer(ws, message, downOnly){
const id=ws.clientId; //getId(ws);
	console.log('ID: ',id.toString())
const planb=message.planb;
const capabilitySDP=message.capability;
	//let peer=soupRoom.Peer(id);
	console.log('MESSAGE.ROOMNAME: ',message.roomname);
	let peer=droom.get(message.roomname).Peer(id.toString());
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
const id=ws.clientId;//getId(ws);
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

function handleAnswer(ws, message) {
  const id = ws.clientId;//getId(ws);
  let peerconnection = getPeerConnection(id);
  if (! peerconnection) {
    console.warn('WARN: connection not found. id=', id);
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
    console.eror('setRemoteDescription for Answer ERROR:', err)
  });
}

function dumpPeer(peer, caption) {
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
const id = ws.clientId;
let peerconnection = getPeerConnection(id);
if (! peerconnection) {
console.warn('WARN: cleanUpPeer(id) , connection not found. id=', id);
return;
}
  
  console.log('PeerConnection close. id=' + id);
  peerconnection.close();
	//droom.get.delete(name);
  deletePeerConnection(id);

 if(droom.get(name)){ console.log('-- peers in the room = ' + droom.get(name).peers.length);}
}

function sendSDP(ws, sessionDescription) {
  const id = ws.clientId;//getId(ws);
  let message = { sendto: id, type: sessionDescription.type, sdp: sessionDescription.sdp };
  console.log('--- sending sdp ---');
  //console.log(message);
  console.log('sendto:' + message.sendto + '   type:' + message.type);

  // send via websocket
  sendback(ws, message);
}
