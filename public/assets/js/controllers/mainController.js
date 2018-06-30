var app =angular.module('mainApp',['ngRoute']);

var uName;//for passing username to next page

var clientID=null;//

app.config(['$qProvider','$routeProvider','$locationProvider',function($qProvider,$routeProvider,$locationProvider){
    $routeProvider.when('/',{
        url:'/login',
        templateUrl:'/assets/views/login.html',
        controller:'loginCtrl'
    })
    .when('/chatRoom',{
        url:'/chatRoom',
        templateUrl:'/assets/views/chatRoom.html',
        controller:'chatCtrl'
    })
    .when('/register',{
        url:'/register',
        templateUrl:'/assets/views/register.html',
        //controller:''
    })
    .otherwise({
        url:'/404-error',
        redirectTo:'/assets/views/404.html'
    });
    $locationProvider.html5Mode({
        enabled:true,
        requireBase:false
    });
    $qProvider.errorOnUnhandledRejections(false);
}]);

var myUserArrayForCtrl=[];
app.controller('loginCtrl',function($scope,$location,$http){

    console.log('hello from main controller');

    $scope.joinChat=function(){
        uName=$scope.userName;
        if(!uName){
            return;
        }
        console.log('userName => '+uName);
        $scope.userName='';
        
        $http({
            method:'POST',
            url:'/main',
            data:{
                myUser:uName
            },
            headers: {
                'Content-Type': 'application/json' //application/json,application/x-www-form-urlencoded
            }
        }).then(function(response){
            
            console.log('new user posted to express successfully!');
            // $location.path('chatRoom');
        });
        $location.path('chatRoom');           
    }
});

app.controller('chatCtrl',function($scope,$http,$interval,$location){
    
    var socket=io.connect();
    var uploader = new SocketIOFileClient(socket);
    var oldMessagesFromMongoDB=[];
    var t=0;
    var isFile=0;
    
    // var msgArray=[];
    $http({
        method:'GET',
        url:'/oldMsgs'
    }).then(function(response){
        
        console.log('controller got a response for oldMsgs successfully');
        oldMessagesFromMongoDB=response.data;
        //console.log(response);
        //console.log(oldMessagesFromMongoDB);
        var oldArray=[];

        oldMessagesFromMongoDB.forEach(function(element) {
            //console.log(element);
            // $scope.msgArray.push(element);// stores messages for displaying in chatRoom
            oldArray.push(element);
        }, this);

        $scope.msgArray=oldArray;
    });    
    
    console.log('hello from chat controller');
    $scope.uname=uName;//username
    var r=false;

    socket.on('chat-message',function(msg){

        if(!isNaN(msg)){
            if(msg==clientID){
                socket.disconnect();
                console.log('socket is closed from controller');
                $location.path('/');
                return;
            }
            else if(msg<clientID){
                // clientID--;
                ///////////
                $http({
                    method:'GET',
                    url:'/existingUsers'
                }).then(function(response){
                    
                    console.log('controller got a response for existingUsers successfully');

                    $scope.usersArray=response.data;
                    var older=[];
                    older=$scope.usersArray;
                    $scope.$apply;

                    for(c=0;c<older.length;c++){
                        // console.log(c+'-'+myRemUserArray[c]);
                        if(uName==older[c]){
                            clientID=c;
                            break;
                        }
                    } 
                });
                ///////////
                r=true;
                return;
            }
        }
        var nMsg=msg;
        var first=nMsg.indexOf('#');
        var last=nMsg.lastIndexOf('#');
        if(first>-1 && last>first){
            console.log('this is a secret message ');
            
            var myClient=nMsg.substring(first+1,last)
            console.log('myClient =>'+myClient);
            if(uName==myClient){
                var myNewMsg=msg.substring(last+1);
                $scope.msgArray.push(myNewMsg+'*');//pushing into array
            }
        }
        else if(isNaN(msg)){            
            $scope.msgArray.push(msg);//pushing into array
        }
    });

    $http({
        method:'GET',
        url:'/chatRoom' 
    }).then(function(response){
        
        console.log('controller got a userArray response successfully');
        $scope.usersArray=response.data;
        var tUsers=$scope.usersArray;      
        clientID=(tUsers.length)-1;
        $scope.onlineUsers=(tUsers.length);
        console.log('clientId => '+(clientID));
        // for(i=0;i<$scope.usersArray.length;i++){
        //     console.log($scope.usersArray[i]);
        // }
    });
    //////////uploader for files///////////////////
    uploader.on('start', function(fileInfo) {
        console.log('Start uploading', fileInfo);
    });
    uploader.on('stream', function(fileInfo) {
        console.log('Streaming... sent ' + fileInfo.sent + ' bytes.');
    });
    uploader.on('complete', function(fileInfo) {
        console.log('Upload Complete', fileInfo);
    });
    uploader.on('error', function(err) {
        console.log('Error!', err);
    });
    uploader.on('abort', function(fileInfo) {
        console.log('Aborted: ', fileInfo);
    });
    ////////////////////////////////////////////////
    //console.log(new Date());//for getting date
    $scope.send=function (){

        if(!$scope.msg ){
            return;
        }        

        if(!$scope.filesArray){
            isFile=0;
            return;
        }
        isFile=1;



        // socket.emit('chat-message','messages are read by '+uName);
        var newMsg=$scope.msg+'('+uName+')';

        console.log('chat->send is clicked');
        console.log('data => '+newMsg);
        socket.emit('chat-message',newMsg);        
        
        $http({
            method:'POST',
            url:'/chatRoom',
            data:{
                myMsg:newMsg,
                from:uName
            },
            headers: {
                'Content-Type': 'application/json' //application/json,application/x-www-form-urlencoded
            }
        }).then(function(response){

            console.log('msg posted to express successfully!');
            $scope.msg='';//reset or clear the msg ng-model or variable
            $scope.$apply;//all updated $scope variables are refreshed
        });
        
        $scope.msg='';//reset or clear the msg ng-model or variable
        $scope.$apply;//all updated $scope variables are refreshed
        t=0;
    } 

    $scope.refreshForOnlineUsers=function(){
        
        $http({
            method:'GET',
            url:'/chatRoom' 
        }).then(function(response){
            
            console.log('controller got a response successfully in refreshUsers');
            $scope.usersArray=response.data;
            var tUsers=$scope.usersArray;
            myUserArrayForCtrl=$scope.usersArray;
            // clientID=(tUsers.length)-1;
            console.log('clientID = '+clientID);

            $scope.onlineUsers=(tUsers.length);
            for(i=0;i<$scope.usersArray.length;i++){
                console.log($scope.usersArray[i]);
            }
        });
    }

    $scope.remove=function(){
        var myVar=null;//for removing the client by his id 
        // var rmvUser=$scope.removeUser;
        if(!$scope.removeUser){
            return;
        }
        var rmvUser=$scope.removeUser;
        if(uName!='admin'){
            console.log('u donot have admin rights');
            alert('u donot have admin rights');
            $scope.removeUser='';

            return;
        }else{//if we provide the client ID instead of name
            if(!isNaN(rmvUser)){
                myVar=rmvUser;

                var myRemUserArray=[];
                myRemUserArray=$scope.usersArray;
                var rmvUser=myRemUserArray[myVar];//username is taken out from the users array
                console.log('u requested to remove username = '+rmvUser);
            }else{
                var myRemUserArray=[];
                myRemUserArray=$scope.usersArray;
                for(c=0;c<myRemUserArray.length;c++){
                    console.log(c+'-'+myRemUserArray[c]);
                    if(rmvUser==myRemUserArray[c]){
                        myVar=c;
                        break;
                    }
                }            
            }
            console.log('u requested to remove username = '+rmvUser);
             
            // socket.emit('chat-message',myVar);
            //
            $http({
                method:'POST',
                url:'/rmvUserFromArray',
                data:{
                    rmvUser:rmvUser,//name
                    myVar:myVar,//ID
                    myMsg:'client "'+rmvUser+'" has been removed from chat by admin'
                },
                headers: {
                    'Content-Type': 'application/json' //application/json,application/x-www-form-urlencoded
                }
            }).then(function(response){
    
                console.log('controller got a response successfully in removeUser');
    
                console.log('removed user posted to express successfully!');
                $scope.msg='';//reset or clear the msg ng-model or variable
                $scope.$apply;//all updated $scope variables are refreshed
                socket.emit('chat-message','client "'+rmvUser+'" has been removed from chat by admin');
    
                console.log('removeClient is called for client # '+myVar);
    
                $scope.usersArray=response.data;
                var newArr=[];
                newArr=$scope.usersArray;
                for(c=0;c<newArr.length;c++){
                    console.log(c+'-'+newArr[c]);
                    if(uName==newArr[c]){
                        clientID=c;
                        // socket.emit('chat-message',myVar);
                        break;
                    }
                }
     
                // socket.emit('chat-message',myVar);
                $scope.removeUser='';
            });
        }        
    }

    $interval(function(){//this function occurs automatically after specific milliseconds     
        


        /////total users
        var myLen=$scope.usersArray;
        var l=myLen.length;
        $scope.onlineUsers=l;
        // if(r){
        //     clientID--;
        //     r=false;
        // }
        /////for msg read////
        if($scope.msg && (t==0 || t===0)){//for seen it must be fulfiled
            
            socket.emit('chat-message','messages are read by '+uName);  
            t=1;
            $http({
                method:'POST',
                url:'/seen',
                data:{
                    seenBy:'messages are read by '+uName
                },
                headers: {
                    'Content-Type': 'application/json' //application/json,application/x-www-form-urlencoded
                }
            }).then(function(response){
    
                console.log('controller got a response successfully in msgSeen');
            });
        }
        $scope.$apply;//use to apply the changes to $scope variables 
    },0);//0 is the time in milliseconds
});