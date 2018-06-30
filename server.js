const express=require('express');// for creating and managing express server
const path=require('path');//for mentaining file paths
const http=require('http');//for mentaining http connections
const multer=require('multer');
const bodyParser=require('body-parser');//for json and url encoded raw data
const socketIO=require('socket.io');//for creating sockets
const SocketIOFile = require('socket.io-file');//for sharing files

const mongo=require('mongodb').MongoClient;//for mongoDB
const assert = require('assert');
const mongoServerUrl='mongodb://localhost:27017';//for connecting to mongoDB server using ip and port
const dbName='chatApp';//my chat DB name
const mongoose=require('mongoose');//a mongo DB module

const app=express();
const port=process.env.PORT || 9090;//



app.use(express.static('public'));//for serving foler to  web app 
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true })); // for parsing application/x-www-form-urlencoded


const server=http.createServer(app);

const io=socketIO(server);

io.on('connection',function(socket){
    console.log('new user connected to server');

    socket.on('chat-message',function(msg){
        io.emit('chat-message',msg);
        console.log('mesage =>' + msg);

    });

    ///////////////////////uploader for files////////////////
    var uploader = new SocketIOFile(socket, {
        // uploadDir: {			// multiple directories
        // 	music: 'data/music',
        // 	document: 'data/document'
        // },
        uploadDir: 'data',							// simple directory
        accepts: ['audio/mpeg', 'audio/mp3'],		// chrome and some of browsers checking mp3 as 'audio/mp3', not 'audio/mpeg'
        maxFileSize: 4194304, 						// 4 MB. default is undefined(no limit)
        chunkSize: 10240,							// default is 10240(1KB)
        transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
        overwrite: true 							// overwrite file if exists, default is true.
    });
    uploader.on('start', (fileInfo) => {
        console.log('Start uploading');
        console.log(fileInfo);
    });
    uploader.on('stream', (fileInfo) => {
        console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
    });
    uploader.on('complete', (fileInfo) => {
        console.log('Upload Complete.');
        console.log(fileInfo);
    });
    uploader.on('error', (err) => {
        console.log('Error!', err);
    });
    uploader.on('abort', (fileInfo) => {
        console.log('Aborted: ', fileInfo);
    });

    ////////////////////////////////////////////////////////

    // socket.on('removeClient',function(myIndex){
    //     // socket.disconnect(myIndex);
    //     console.log('client at index # '+myIndex+' has been removed from chat');
    //     io.emit('chat-message',myIndex);
    //     socket.disconnect(myIndex);
    // });

    socket.on('disconnect',function(){
        //user disconnected
        console.log('user disconnected');
    });
});

var myUserArray=[];

app.get('/getUsersArray',function(req,res){
    console.log('res is called for getUsersArray');
    res.json(myUserArray);    
});

app.get('/existingUsers',function(req,res){
    console.log('res is called for getUsersArray');
    res.json(myUserArray);    
});



app.post('/main',function(req,res){
    
    var nUser=req.body.myUser;
    var checker=1;
    for(var x=0;x<myUserArray.length;x++){
        if(nUser==myUserArray[x] || nUser===myUserArray[x]){
            checker=0;
        }
    }
    if(checker==1 || checker===1){//pushing the incomming new client to clientsArray
        myUserArray.push(nUser);//for passing all online users between all clients
    }
    ////////////////////////////for saving users in database///////////////////////
    // myUserArray.push(nUser);//for passing all online users between all clients
    // var myDate=new Date();
    // myDate=myDate;
    // var obj={
    //     _id:myDate,
    //     user:nUser
    // };
    // //for mongoDB
    // mongo.connect(mongoServerUrl,function(err,client){
    //     assert.equal(null,err);//for error checking during connection to DB
    //     console.log('connected to mongoDbServer successfully.');
    //     const db=client.db(dbName);
    //     db.collection('users').insertOne(obj,function(err,r){
    //         assert.equal(null,err);
    //         assert.equal(1,r.insertedCount);
    //         console.log('data inserted!');
    //     });
    //     client.close();
    //     console.log('clientDB stopped');
    // });
    res.json({});
});

app.get('/oldMsgs',function(req,res){
    console.log('res is called for oldMsgs'); 
    //for mongoDB
    var resultArray=[];//all messages from database
    mongo.connect(mongoServerUrl,function(err,client){
        assert.equal(null,err);//for error checking during connection to DB
        console.log('connected to mongoDbServer successfully.');
        const db=client.db(dbName);

        var cursor =db.collection('messages').find();
        
        cursor.forEach(function(doc,err){
            assert.equal(null,err);
            //console.log(doc.msg);
            resultArray.push(doc.msg);
        },function(){
            res.json(resultArray);
            console.log('respose sent for oldMsgs');
        });
        client.close();
        console.log('clientDB stopped');
    });    
    // resultArray.forEach(function(element) {
    //     console.log(element);
    // }, this);
});

app.get('/chatRoom',function(req,res){
    console.log('res is called for chatRoomUsers');   
    // for(i=0;i<myUserArray.length;i++){
    //     console.log(myUserArray[i]);
    // }
    res.json(myUserArray);
});
app.post('/seen',function(req,res){
    if(!req.body){
        console.log('error fetching rmvUser and myVar');
    }else{
        console.log('seen by =>' + req.body.seenBy);

        var seenBy=req.body.seenBy;

        ///////////
        mongo.connect(mongoServerUrl,function(err,client){
            assert.equal(null,err);//for error checking during connection to DB
            console.log('connected to mongoDbServer successfully.');
            const db=client.db(dbName);

            var obj={
                _id:new Date(),
                msg:seenBy
            };

            db.collection('messages').insertOne(obj,function(err,r){
                assert.equal(null,err);
                assert.equal(1,r.insertedCount);
            });
            client.close();
            console.log('clientDB stopped');
        });
        ///////////
        res.json({});
    }
});
app.post('/rmvUserFromArray',function(req,res){
    if(!req.body){
        console.log('error fetching rmvUser and myVar');
    }else{
        console.log('rmvUser =>' + req.body.rmvUser);
        console.log('index in userArray =>' + req.body.myVar);

        var userName=req.body.rmvUser;//name
        var userIndex=req.body.myVar;//ID
        var userMsg=req.body.myMsg;//msg

        if(userIndex>-1){
            myUserArray.splice(userIndex,1);
            console.log('a client is removed from chat');
            console.log(myUserArray);
        }
        // socket.emit('removeClient',userIndex);
        console.log('client at index # '+userIndex+' has been removed from usersArray');
        // io.emit('chat-message',userIndex);
        // socket.disconnect(userIndex);

        ///////////
        mongo.connect(mongoServerUrl,function(err,client){
            assert.equal(null,err);//for error checking during connection to DB
            console.log('connected to mongoDbServer successfully.');
            const db=client.db(dbName);

            var obj={
                _id:new Date(),
                msg:userMsg
            };

            db.collection('messages').insertOne(obj,function(err,r){
                assert.equal(null,err);
                assert.equal(1,r.insertedCount);
            });
            client.close();
            console.log('clientDB stopped');
            // io.emit('chat-message',userIndex);
        });
        ///////////
        io.emit('chat-message',userIndex);
        res.json(myUserArray);
    }
});

app.post('/chatRoom',function(req,res){
    //console.log(req.body);
    if(!req.body){
        console.log('error fetching postMsg'); 
    }else{
        //console.log(req);//the whole request        
        console.log('get post request is called and postMsg is =>' + req.body.myMsg);
        ////for tester
        var nMsg= req.body.myMsg;
        var fromUser=req.body.from;
        var to='ALL';
        var first=nMsg.indexOf('#');
        var last=nMsg.lastIndexOf('#');
        if((first>-1 && last>-1) && (first!=last)){
            console.log('this is a secret message ');
            //io.emit('chat-message',nMsg);
            to=nMsg.substring(first+1,last);
            console.log('secret message object posted to client ');
        }
        else{
            //for mongoDB
            mongo.connect(mongoServerUrl,function(err,client){
                assert.equal(null,err);//for error checking during connection to DB
                console.log('connected to mongoDbServer successfully.');
                const db=client.db(dbName);

                var obj={
                    _id:new Date(),
                    msg:req.body.myMsg
                };

                db.collection('messages').insertOne(obj,function(err,r){
                    assert.equal(null,err);
                    assert.equal(1,r.insertedCount);
                });
                client.close();
                console.log('clientDB stopped');
            });
        }      

        var cS=0;;
        for(i=0;i<nMsg.length;i++){//here checksum is calculated
            if(nMsg[i]!=' '){
                cS=1;
            }else{
                cS=0;
            }
        }
        var pUID=new Date();//packet UID
        console.log('////////////////////////////////////////');
        console.log('//////////The mesage packet is /////////');
        console.log('////////////////////////////////////////');
        console.log('|version # 1.0| packetUID #'+pUID+'|' );
        console.log('|message type # text| packetLength #'+nMsg.length+'|' );
        console.log('////////////////////////////////////////');
        console.log('|ttl # ---| checkSum #'+cS+'|' );
        console.log('////////////////////////////////////////');
        console.log('|options # ---|' );
        console.log('////////////////////////////////////////');
        console.log('|to # '+to+'|' );
        console.log('////////////////////////////////////////');
        console.log('|from # '+fromUser+'|' );
        console.log('////////////////////////////////////////');
        console.log('|clientServerStatus # Active|loginRegisterStatus # ---|sentStatus # 1|recievedStatus # 1|' );
        console.log('////////////////////////////////////////');
        console.log('|seenStatus # 1| reserved # ---|' );
        console.log('////////////////////////////////////////');
        console.log('|data #'+ nMsg.substring(last+1)+'|')
        console.log('////////////////////////////////////////');
        
        res.json({});//empty response
    } 
});

server.listen(port,function(){
    console.log('server started listening on port :'+port);
});