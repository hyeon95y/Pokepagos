// #Pokepagos 서버
//
// node.js로 구현된 Pokepagso의 서버이다

// ##1. 서버 설정
// 모듈 추출
var fs = require('fs');
var express = require('express');
var socketio = require('socket.io');

// 웹 서버와 소켓 서버 생성
var app = express();
var io = socketio();
var server = require('http').createServer(app);

// 소켓 서버를 웹 서버에 연결
io.attach(server);

// csv파일 읽기
var csvfile = fs.readFileSync(__dirname+'/files/pokemon_number(csv).csv').toString();
var csv = [];
var rows = csvfile.split("\n");
for (var i = 0; i < rows.length; i++) {
  var cells = rows[i].split(",");
  csv.push( cells );
}



app.use(express.static(__dirname + '/public'));
//console.log(__dirname);

app.use('/script', express.static(__dirname + '/script'));
//console.log(__dirname);

app.use('/images', express.static(__dirname + '/images'));
//console.log(__dirname);



// 서버 실행
server.listen(52273, function() {
    console.log('Server Running at http://127.0.0.1:52273');
});

// ##2. 함수 생성



// 닉네임 변수
// * event isNicknameOkay에 사용
var nicknames = [];
// 닉네임 뒤에 붙는 tempNumber생성
// * event isNicknameOkay에 사용
function createTempNumber() {
    var tempNumber = Math.floor(Math.random() * 100);
    if (tempNumber < 10) {
        tempNumber = "0" + tempNumber;
    }
    return tempNumber;
}
// nicknames에서 해당 닉네임의 모든 태그가 사용 불능인지 판단
// * event isNicknameOkay에 사용
function checkOtherTags(data) {
    var checkedNumber = [];
    var nicknameAssigned = false;
    var tempNickname = "";
    while ((checkedNumber.length != 100) && (nicknameAssigned === false)) {
        tempNickname = data + '#' + createTempNumber();
        nicknameAssigned = nicknames.indexOf(tempNickname);
    }
    if (nicknameAssigned === true) {
        return tempNickname;
    } else {
        return false;
    }
}
// 연결 종료됐을때 id로 닉네임의 index 찾아서 return
// * event disconnect에 사용
function findIndexOfNicknameById(id) {
    for (var index in nicknames) {
        if (nicknames[index].id === id) {
            return index;
        }
    }
    return -1;
}

// 방 객체 배열 변수
var roomList = [];

// var screenSize에 따라 반환할 객체의 개수를 정함
// * event goToLobby, function returnRoomlist에 사용
// *  event getMoreRooms에 사용, function returnMoreRoomlist에 사용
// ## 디자이너 승인 후 구현
function howManyRoomsWillBeReturned(data) {
    //data는 event goToLobby에서 전송받은 var screenSize
    return 3;
}

// 로비에 접속했을 경우에 var howManyRooms 만큼 방 리스트를 return해줌
// * event goToLobby에 사용
function returnRoomlist(numberOfRoomsWillBeReturned) {
    var tempArray = [];
    var numberOfRoomsChecked = 0;
    while ((tempArray.length < numberOfRoomsWillBeReturned) && (numberOfRoomsChecked < roomList.length)) {
        if (roomList[numberOfRoomsChecked].currentPlayer < roomList[numberOfRoomsChecked].maxPlayer) {
            tempArray.push(roomList[numberOfRoomsChecked]);
        }
        numberOfRoomsChecked++;
    }
    return tempArray;
}
// #returnRoomlist함수에 문제가 있음
// 방 리스트 추가로 요청할때
// * event getMoreRooms에 사용
function returnMoreRoomlist(numberOfRoomsWillBeReturned, largestRoomNumber) {
    var tempArray = [];
    //가장 룸넘버가 큰 방의 다음 방부터
    var indexOfLargestRoomNumber = findIndexOfRoom(largestRoomNumber) + 1;
    while ((tempArray.length < numberOfRoomsWillBeReturned) && (indexOfLargestRoomNumber < roomList.length)) {
        if (roomList[indexOfLargestRoomNumber].currentPlayer < roomList[indexOfLargestRoomNumber].maxPlayer) {
            tempArray.push(roomList[indexOfLargestRoomNumber]);
        }
        indexOfLargestRoomNumber++;
    }
    return tempArray;
}

// event enterRoom을 받았을때 데이터(닉네임, currentPlayer)를 실제로 객체에 추가해줌
// * event enterRoom에 사용
function enterRoom(roomNumber, nickname) {
    //앞에서 다 필터링 되서 접속 가능한 방만 이 함수가 실행됨
    //currentPlayer 추가
    var indexOfRoom = findIndexOfRoom(roomNumber);
    roomList[indexOfRoom].currentPlayer++;


    //player1,2,3,4중 비는곳에 차례대로 넣음
    if (roomList[indexOfRoom].player1 === "none") {
        roomList[indexOfRoom].player1 = nickname;
        return;
    } else if (roomList[indexOfRoom].player2 === "none") {
        roomList[indexOfRoom].player2 = nickname;
        return;
    } else if (roomList[indexOfRoom].player3 === "none") {
        roomList[indexOfRoom].player3 = nickname;
        return;
    } else {
        roomList[indexOfRoom].player4 = nickname;
        return;
    }
}


// roomNumber로 방의 인덱스 찾는 함수
// * event enterRoom에 사용
// * function returnMorRoomlist에 사용
function findIndexOfRoom(roomNumber) {
    var index = 0;
    while ((roomList[index].roomNumber != roomNumber) && (index < roomList.length)) {
        index++;
    }
    if (roomList[index].roomNumber == roomNumber) {
        return index;
    } else {
        return -1;
    }
}

// 새로운 roomNumber 할당하는 함수
// * event makeRoom에 사용
function generateNewRoomNumber() {
    var tempRoomNumber = 1;
    var sameNumberExist = true;
    while (sameNumberExist === true) {
        //똑같은거 있는지 확인하는 boolean
        tempBoolean = false;
        for (var index = 0; index < roomList.length; index++) {
            //똑같은거 있으면 tempBoolean true로 변경
            if (tempRoomNumber == roomList[index].roomNumber) {
                tempBoolean = true;
            }
        }
        //똑같은게 없었으면 sameNumberExist false로 바꾸고 tempRoomNumber를 return
        if (tempBoolean === false) {
            sameNumberExist = false;
            if (tempRoomNumber < 10) {
                tempRoomNumber = "00" + tempRoomNumber;
                return tempRoomNumber;
            } else if (10 <= tempRoomNumber && tempRoomNumber < 100) {
                tempRoomNumber = "0" + tempRoomNumber;
                return tempRoomNumber;
            } else {
                return tempRoomNumber;
            }

        }
        //똑같은거 있었으면 tempRoomNumber+1 하고 다음으로..
        else {
            tempRoomNumber++;
        }
    }
}

// 유저를 방에서 내보내는 함수
// * event kickRequest에 사용
// roomList 객체에서 player를 제거하는 역할을 한다
// 내보낸 사람이 master이면 master를 위임한다
function userExit(roomNumber, kickedUser) {
    //방의 인덱스 찾음
    var indexOfRoom = findIndexOfRoom(roomNumber);
    //플레이어의 인덱스 찾음
    var indexOfPlayer = findIndexOfPlayer(indexOfRoom, kickedUser);
    //플레이어를 객체에서 삭제
    switch (indexOfPlayer) {
        case 1:
            roomList[indexOfRoom].player1 = "none";
            break;
        case 2:
            roomList[indexOfRoom].player2 = "none";
            break;
        case 3:
            roomList[indexOfRoom].player3 = "none";
            break;
        case 4:
            roomList[indexOfRoom].player4 = "none";
            break;
        default:
            break;
    }

    //currentPlayer--;
    roomList[indexOfRoom].currentPlayer--;

    //새로운 방장 지정
    if (kickedUser == roomList[indexOfRoom].master) {
        var masterSet = false;
        if (roomList[indexOfRoom].player1 !== "none") {
            roomList[indexOfRoom].master = roomList[indexOfRoom].player1;
            masterSet = true;
        }
        if ((roomList[indexOfRoom].player2 !== "none") && (masterSet === false)) {
            roomList[indexOfRoom].master = roomList[indexOfRoom].player2;
            masterSet = true;
        }
        if ((roomList[indexOfRoom].player3 !== "none") && (masterSet === false)) {
            roomList[indexOfRoom].master = roomList[indexOfRoom].player3;
            masterSet = true;
        }
        if ((roomList[indexOfRoom].player4 !== "none") && (masterSet === false)) {
            roomList[indexOfRoom].master = roomList[indexOfRoom].player4;
            masterSet = true;
        }
    }
}

// 방에서 유저가 몇번째 player인지 찾는 함수
// * event kickRequest에 사용
// * function userExit()에 사용
function findIndexOfPlayer(indexOfRoom, playerToFind) {
    if (roomList[indexOfRoom].player1 == playerToFind) {
        return 1;
    } else if (roomList[indexOfRoom].player2 == playerToFind) {
        return 2;
    } else if (roomList[indexOfRoom].player3 == playerToFind) {
        return 3;
    } else if (roomList[indexOfRoom].player4 == playerToFind) {
        return 4;
    } else {
        return -1;
    }
}

// 방이 비어있으면 방 객체 제거하는 함수
// * event kickRequest에 사용
function removeIfRoomIsEmpty(roomNumber) {
    var indexOfRoom = findIndexOfRoom(roomNumber);
    if (
        roomList[indexOfRoom].player1 === "" &&
        roomList[indexOfRoom].player2 === "" &&
        roomList[indexOfRoom].player3 === "" &&
        roomList[indexOfRoom].player4 === ""
    ) {
        //방 삭제
        roomList.splice(indexOfRoom, 1);
        console.log("Room " + indexOfRoom + "has been removed");
    }
}

// 닉네임으로 들어가있는 룸넘버 찾아내는 함수
function findRoomNumberByNickname(nickname) {
    for (var indexOfRoom in roomList) {
        if ((roomList[indexOfRoom].player1 === nickname) || (roomList[indexOfRoom].player2 === nickname) || (roomList[indexOfRoom].player3 === nickname) || (roomList[indexOfRoom].player4 === nickname)) {
            return roomList[indexOfRoom].roomNumber;
        }
    }
}

/////////////////이 위로는 함수 구현부





/////////////////이 아래는 소켓 구현부

// ##3. io event 설정

io.sockets.on('connection', function(socket) {
    console.log('# Socket.id : ' + socket.id + ' connected');

    // event isNicknameOkay
    // * data로 var nickname을 받는다
    socket.on("isNicknameOkay", function(data) {
        var tempObject = {};
        console.log('nickname length' + data.length);
        //1) 닉네임이 조건에 위배되지 않는 경우
        if(data.length < 10)
        {
        //a) 동일한 닉네임이 없을경우 난수 태그 생성해서 추가
        if (nicknames.indexOf(data) == -1) {
            var tempNickname = data + '#' + createTempNumber();
            tempObject = {
                nickname: tempNickname,
                id: socket.id
            };
            nicknames.push(tempObject);
            var objectToSend = {
                result: true,
                assignedNickname: tempNickname
            };
            socket.emit('nicknameCheckResult', objectToSend);
            console.log('# Nickname assigned and pushed : ' + tempNickname + ', socket.id : ' + socket.id);
            //여기여기
            //csv보내줌
            socket.emit('sendCSV', csv);

        }

        //b) 동일한 닉네임이 있고 다른 숫자가 사용가능할 경우
        else if (nicknames.indexOf(data) != -1) {
            var result = checkOtherTags(data);
            if (result !== false) {
                tempObject = {
                    nickname: result,
                    id: socket.id
                };
                nicknames.push(bject);
                socket.emit('nicknameCheckResult', true);
                console.log('# Nickname assigned and pushed : ' + result);
            }

            //c) 동일한 닉네임이 있고 다른 숫자 사용 불가능할경우
            else if (result === false) {
                socket.emit('nicknameCheckResult', undefined);
                console.log('# Nickname rejected : ' + result);
            }
          }
        }
        //2) 닉네임이 조건에 위배됨
        else if(data.length>10){
          socket.emit('nicknameCheckResult', false);
          console.log('# Nickname rejected : ' + data);
        }
    });

    // event goToLobby
    // * data로 var screenSize를 받는다
    socket.on("goToLobby", function(data) {
        //몇 개의 객체를 return할지 결정
        var numberOfRoomsWillBeReturned = howManyRoomsWillBeReturned(data);
        //객체 골라내는 함수 실행하고, event returnRoomlist 발생
        socket.emit('returnRoomlist', returnRoomlist(numberOfRoomsWillBeReturned));
        console.log('# Roomlist has been called');
    });

    // event getMoreRooms
    // * data로 var roomList에 존재하는 가장 큰 roomNumber와 screenSize를 받는다
    socket.on("getMoreRooms", function(data) {
        console.log("getmorerooms roomnumber : " + data.roomNumber);
        console.log("getmorerooms screensize : " + data.screenSize);
        //몇 개의 객체를 return할지 결정
        var numberOfRoomsWillBeReturned = howManyRoomsWillBeReturned(data.screenSize);
        //객체 골라내는 함수 실행하고, event sendMoreRooms 발생
        socket.emit("sendMoreRooms", returnMoreRoomlist(numberOfRoomsWillBeReturned, data.roomNumber));
        console.log('# Additional roomlist has been called');

    });

    // event enterRoom
    // * data로 var nickname과 var selectedRoom을 받는다
    socket.on("enterRoom", function(data) {
        //입력 받은 방 번호에 접속가능한지 체크
        var indexOfRoom = findIndexOfRoom(data.selectedRoom);
        //a)입력받은 방 번호가 서버에 존재하고 정원이 다 차지 않았음
        if ((indexOfRoom != -1) && (roomList[indexOfRoom].currentPlayer < roomList[indexOfRoom].maxPlayer)) {
            socket.join(data.selectedRoom);
            console.log('# User ' + data.nickname + ' entered room number ' + data.selectedRoom);
            enterRoom(data.selectedRoom, data.nickname);
            socket.emit("roomEnterAvailable", "success");
            socket.emit("sendRoomData", roomList[indexOfRoom]);
        }
        //b)입력받은 방 번호가 서버에 존재하나 정원이 다 차있음
        else if ((indexOfRoom != -1) && (roomList[indexOfRoom].currentPlayer == roomList[indexOfRoom].maxPlayer)) {
            console.log('# User ' + data.nickname + ' reqeusted to enter room number ' + data.selectedRoom + ', but rejected(full)');
            socket.emit("roomEnterAvailable", "full");
        }
        //c)입력받은 방 번호가 서버에 존재하지 않음
        else {
            console.log('# User ' + data.nickname + ' reqeusted to enter room number ' + data.selectedRoom + ', but rejected(notexist)');
            socket.emit("roomEnterAvailable", "notexist");
        }
    });

    // event makeRoom
    // * data로 var roomList의 객체를 받는다
    // *  var object = {
    //	 roomNumber : 27,
    //	 roomName : ‘개허접만ㅎㅎ’,
    //	 currentPlayer : 1,
    //	 maxPlayer : 2,
    //	 player1 : 아리#27,
    //	 player2 : none,
    //	 player3 : none,
    //   player4 : none,
    //	 master : 아리#27,
    //	 generationOfGame : 7,
    //   ruleA : ‘Sky Battle’,
    //	 ruleB : ‘Normal Flat’
    //	 }
    // * roomNumber가 비워진 상태로 받아서 roomNumber를 서버에서 할당한다
    socket.on("makeRoom", function(data) {
        //방 번호 할당
        data.roomNumber = generateNewRoomNumber();
        //roomList에 방 객체 추가
        roomList.push(data);
        //방에 join
        socket.join(data.roomNumber);
        //event makeRoomAssigned로 roomList object보냄
        socket.emit('makeRoomAssigned', data);
    });

    // event kickRequest
    // * whoKicks와 kickWho가 같으면 방 나가기, 다르고 whoKicks가 master이면 강퇴
    // * 다음과 같은 object를 data로 받는다 var kickRequest = {
    //	roomNumber : 27,
    //	whoKicks : 본인의 닉네임,
    // kickWho : 강퇴당하는 사람의 닉네임}
    socket.on("kickRequest", function(data) {
        console.log('whokicks get : ' + data.whoKicks);
        console.log('kickWho get : ' + data.kickWho);
        //방 나가기
        if (data.whoKicks == data.kickWho) {
            //객체에서 player삭제하고 새로운 방장 지정
            userExit(data.roomNumber, data.kickWho);
            //방의 다른 유저들에게 event kickConfirmed 전송
            io.sockets.in(data.roomNumber).emit("kickConfirmed", data.kickWho);
            console.log("# User " + data.kickWho + " leaved Room " + data.roomNumber);
            //빈 방일 경우 삭제
            removeIfRoomIsEmpty(data.roomNumber);

        }
        //강퇴
        if (data.whoKicks == roomList[findIndexOfRoom(data.roomNumber)].master) {
            //객체에서 player삭제, master와 kickWho가 다르므로 새로운 방장은 지정되지 않는다
            userExit(data.roomNumber, data.kickWho);
            //방의 다른 유저들에게 event kickConfirmed 전송
            io.sockets.in(data.roomNumber).emit("kickConfirmed", data.kickWho);
            console.log("# User " + data.kickWho + " is kicked from Room " + data.roomNumber);
            //빈 방일 경우 삭제
            //정상적으로 사용되면 이 코드가 작동할 일은 없지만 네트워크 문제로
            //실행이 꼬이게 되면 여기서 방 폭파해야함
            removeIfRoomIsEmpty(data.roomNumber);
        }

    });

    // event leaveRoom
    // * kickRequest에서 객체를 제거하고 kickConfirmed를 보내는데 이에 대한 클라이언트의 응답이다
    // * 이 응답을 이용해 나간 유저를 특정하고 socket 연결을 해제한다
    // * data로 var nickname, var roomNumber를 받는다
    socket.on("leaveRoom", function(data) {
        //방 연결 해제
        socket.leave(data.roomNumber);
        console.log("# User " + data.nickname + " disconnected from Room " + data.roomNumber);
    });

    // event sendMessage
    // * 클라이언트에서 채팅 메세지를 서버로 보내오는 기능
    // * 이 event를 받고 event deliverMessage로 같은 방에 메세지를 뿌려준다
    socket.on("sendMessage", function(data) {
        console.log('got message');
        console.log(data.nickname);
        console.log(data.message);
        console.log(data.roomNumber);
        var tempObjectToSend = {
            nickname: data.nickname,
            message: data.message
        };
        io.sockets.in(data.roomNumber).emit("deliverMessage", tempObjectToSend);
    });

    // event disconnected
    // * 접속 종료되면 닉네임 제거
    // ## html 테스트 이후 구현
    socket.on('disconnect', function() {



        //disconnect된 id의 닉네임 인덱스를 찾음
        //닉네임의 인덱스가 없을 경우 -1을 반환
        var leavingIndexOfNickname = findIndexOfNicknameById(socket.id);

        //닉네임이 존재할 경우에
        if (leavingIndexOfNickname !== -1) {
            //닉네임 찾음
            var leavingNickname = nicknames[findIndexOfNicknameById(socket.id)];
            //닉네임으로 접속된 방 있는지 찾음, 없으면 undefined
            var leavingRoomNumber = findRoomNumberByNickname(leavingNickname.nickname);
            //접속된 방이 있을 경우에 방에서 내보냄
            if (leavingRoomNumber !== undefined) {
                //방 객체에서 제거 (룸넘버, 닉네임)
                userExit(leavingRoomNumber, leavingNickname);
                //방의 다른 유저들에게 event kickConfirmed 전송
                io.sockets.in(leavingRoomNumber).emit("kickConfirmed", leavingNickname);
                console.log("# User " + leavingNickname.nickname + " leaved Room " + leavingRoomNumber);
                //빈 방일 경우 삭제
                removeIfRoomIsEmpty(leavingRoomNumber);
            }
            //socket leave는 자동으로 됨

            //출력용 메세지
            //메세지에 닉네임이 필요하므로 아직 닉네임 제거하면 안됨
            console.log("# Socket.id : " + socket.id + ", nickname : " + nicknames[findIndexOfNicknameById(socket.id)].nickname + " disconnected");


            //출력후 닉네임 제거
            nicknames.splice(findIndexOfNicknameById(socket.id), 1);

        } else {
            console.log("# Socket.id : " + socket.id + " disconnected");
        }
    });


});



///이 아래는 테스트용 환경을 구현하기 위한 코드

var tempRoom = {
    roomNumber: '',
    roomName: '개허접만ㅎㅎ',

    currentPlayer: 0,
    maxPlayer: 2,
    player1: 'none',
    player2: 'none',
    player3: 'none',
    player4: 'none',
    master: 'none',

    generationOfGame: 7,
    ruleA: 'Sky Battle',
    ruleB: 'Normal Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);

tempRoom = {
    roomNumber: '',
    roomName: '총든마이',

    currentPlayer: 1,
    maxPlayer: 2,
    player1: '한조#61',
    player2: 'none',
    player3: 'none',
    player4: 'none',
    master: '한조#61',

    generationOfGame: 7,
    ruleA: 'Halloween Battle',
    ruleB: 'Double Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);

tempRoom = {
    roomNumber: '',
    roomName: '포켓몬짱짱',

    currentPlayer: 1,
    maxPlayer: 2,
    player1: '디바#71',
    player2: 'none',
    player3: 'none',
    player4: 'none',
    master: '디바#71',

    generationOfGame: 7,
    ruleA: 'Random Battle',
    ruleB: 'Normal Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);

tempRoom = {
    roomNumber: '',
    roomName: '오버워치',

    currentPlayer: 2,
    maxPlayer: 4,
    player1: '디바#71',
    player2: '메르시#31',
    player3: 'none',
    player4: 'none',
    master: '디바#71',

    generationOfGame: 7,
    ruleA: 'Random Battle',
    ruleB: 'Normal Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);

tempRoom = {
    roomNumber: '',
    roomName: '메이플스토리',

    currentPlayer: 1,
    maxPlayer: 2,
    player1: '디바#71',
    player2: 'none',
    player3: 'none',
    player4: 'none',
    master: '디바#71',

    generationOfGame: 7,
    ruleA: 'Random Battle',
    ruleB: 'Normal Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);

tempRoom = {
    roomNumber: '',
    roomName: '마비노기',

    currentPlayer: 1,
    maxPlayer: 2,
    player1: '디바#71',
    player2: 'none',
    player3: 'none',
    player4: 'none',
    master: '디바#71',

    generationOfGame: 7,
    ruleA: 'Random Battle',
    ruleB: 'Normal Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);

tempRoom = {
    roomNumber: '',
    roomName: '티모대위',

    currentPlayer: 1,
    maxPlayer: 2,
    player1: '디바#71',
    player2: 'none',
    player3: 'none',
    player4: 'none',
    master: '디바#71',

    generationOfGame: 7,
    ruleA: 'Random Battle',
    ruleB: 'Normal Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);

tempRoom = {
    roomNumber: '',
    roomName: '명을',

    currentPlayer: 1,
    maxPlayer: 2,
    player1: '디바#71',
    player2: 'none',
    player3: 'none',
    player4: 'none',
    master: '디바#71',

    generationOfGame: 7,
    ruleA: 'Random Battle',
    ruleB: 'Normal Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);

tempRoom = {
    roomNumber: '',
    roomName: '받들겠습니다',

    currentPlayer: 1,
    maxPlayer: 2,
    player1: '디바#71',
    player2: 'none',
    player3: 'none',
    player4: 'none',
    master: '디바#71',

    generationOfGame: 7,
    ruleA: 'Random Battle',
    ruleB: 'Normal Flat'
};
tempRoom.roomNumber = generateNewRoomNumber();
//roomList에 방 객체 추가
roomList.push(tempRoom);
