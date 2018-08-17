window.onload = function() {
    // socket 변수
    var socket = io.connect();
    // nickname 변수
    var nickname = "";
    // 현재 방 변수
    var currentRoom = [];
    // 현재 키보드 상태
    var currentUI = "";
    // csv파일
    var csv = [];
    // 포켓몬 박스 불려져왔는지 여부
    var pokemonBoxHasBeenCalled = false;
    // 인덱스 가장 큰 넘버
    var maxIndex = 848;







    // 디바이스정보 변수
    // (가로, 세로, 디바이스 정보)
    var browserSize = {
        width: (window.innerWidth || document.body.clientWidth),
        height: (window.innerHeight || document.body.clientHeight),
        agentInfo: navigator.userAgent
    };

    // ## 1. 이벤트
    // ### 1) 메인 화면

    // csv파일 받음
    socket.on('sendCSV', function(data) {
        csv = data;
    });

    // 닉네임 입력하고 로그인(버튼 클릭)
    // * event isNicknameOkay 발생시킴
    document.getElementById('login').onclick = function() {
        generateIsNickNameOkay();
    };
    // 닉네임 입력하고 로그인(input에서 enter타이핑)
    $("#userPutNickname").keypress(function(e) {
        if (e.keyCode == 13) {
            generateIsNickNameOkay();
        }
    });
    // 제출한 닉네임 결과 확인
    socket.on('nicknameCheckResult', function(data) {
        if (data.result === true) {
            nickname = data.assignedNickname;
            socket.emit('goToLobby', browserSize);
        }
        if (data.result === undefined) {
            alert('You cannot use ' + tempNickname);
        }
    });

    // 방 리스트 받고 로비로 이동
    var roomList = [];
    socket.on('returnRoomlist', function(data) {
        roomList = data;
        goToLobbyFromMainPage();
        showRooms();

    });

    // 추가로 요청한 방 리스트 받고 DOM에 추가
    socket.on('sendMoreRooms', function(data) {
        showMoreRooms(data);
    });

    // ### 2) 로비

    // html에서 enterRoom이벤트 발생시키면 서버가
    // sendRoomdata로 해당 방의 정보를 보내주는데
    // 이를 통해 방에 입장
    socket.on('sendRoomData', function(data) {
        currentRoom = data;
        showRoom(currentRoom);
        currentUI = 'keyboard';
    });

    // kickRequest에 대한 응답
    // data로 kickWho를 받음
    socket.on('kickConfirmed', function(data) {

        console.log('kickwho : ' + data);
        console.log('nickname : ' + nickname);
        //본인이 방을 나가는 경우
        //본인이 강퇴된 경우에도 사용가능할듯(아직 테스트 안해봄)
        if (data == nickname) {
            console.log('im going out');
            var tempObjectToSend = {
                nickname: nickname,
                roomNumber: currentRoom.roomNumber
            };
            //join해제하기 위해 이 방의 id보내줌
            socket.emit('leaveRoom', tempObjectToSend);
            //객체 삭제
            currentRoom = [];
            //DOM 삭제하고 로비로 이동
            goToLobbyFromCurrentRoom();
        }

        //다른 사람이 강퇴된 경우
        if (data != nickname) {
            console.log('somebody kicked');
            //객체에서 제거하고 player 업데이트
            otherUserExit(data);
        }
    });

    // deliverMessage에 대한 응답
    // data로 nickname, message를 받고 #chattingBox에 띄움
    socket.on('deliverMessage', function(data) {
        $('<p>', {
            text: data.nickname + ' : ' + data.message
        }).appendTo($('#chattingBox'));
        console.log('scrollheight : ' + $("#chattingBox")[0].scrollHeight);
        $("#chattingBox").scrollTop($("#chattingBox")[0].scrollHeight);


    });



    // ## 2. 함수
    // input #userPutNickname에서 사용자가 입력한 닉네임 가지고와서
    // event isNicknameOkay 발생시킴
    function generateIsNickNameOkay() {
        tempNickname = $('#userPutNickname').val();
        socket.emit('isNicknameOkay', tempNickname);
    }
    // 메인 페이지 DOM 삭제하고 로비로 이동
    function goToLobbyFromMainPage() {
        $('#mainTitle').remove();
        $('#userPutNickname').remove();
        $('#login').remove();
        $('<div>', {
            id: 'lobby'
        }).appendTo($('body'));
        $('<div>', {
            id: 'roomList'
        }).appendTo($('#lobby'));

        // refreshRoomlist button이 없을 경우 버튼 추가(첫 실행시에만)
        if ($('#refreshRoomlist').length === 0) {
            $('<button>', {
                id: 'refreshRoomlist',
                text: 'refresh'
            }).appendTo($('#lobby'));
            // refresh버튼으로 방 목록 새로고침
            // function deleteAllRooms로 현재 방 객체 모두 제거하고
            // event returnRoomList를 다시 발생시킨 후
            // function showRooms로 다시 화면에 띄운다
            document.getElementById('refreshRoomlist').onclick = function() {
                console.log('deleteall');
                deleteAllRooms();
                socket.emit('goToLobby', browserSize);
            };
        }
        // getMoreRoomlist button이 없을 경우 버튼 추가(첫 실행시에만)
        if ($('#getMoreRoomlist').length === 0) {
            $('<button>', {
                id: 'getMoreRoomlist',
                text: 'getmoreroomlist'
            }).appendTo($('#lobby'));
            // getMoreRoomlist버튼으로 방 목록 더 받아옴
            document.getElementById('getMoreRoomlist').onclick = function() {
                var tempObjectToSend = {
                    screenSize: browserSize,
                    roomNumber: roomList[roomList.length - 1].roomNumber
                };
                socket.emit('getMoreRooms', tempObjectToSend);
            };
        }


    }

    // DOM roomList밑에 있는 모든 자식노드 제거
    function deleteAllRooms() {
        $('#roomList').empty();
    }
    // showRooms()와 showMoreRooms()에서 사용하는 DOM 생성 함수
    function makeDOMForRoom(roomList, tempTagId, indexOfRoom) {
        $('<div>', {
            id: tempTagId,
            class: 'roomSummary',
            style: 'border:1px solid gold;'
        }).appendTo($('#roomList'));
        //방번호추가
        $('<p>', {
            text: roomList[indexOfRoom].roomNumber,
            class: 'roomNumber'
        }).appendTo($('#' + tempTagId));
        //방제목추가
        $('<p>', {
            text: roomList[indexOfRoom].roomName,
            class: 'roomName'
        }).appendTo($('#' + tempTagId));
        //현재인원/최대인원
        $('<p>', {
            text: roomList[indexOfRoom].currentPlayer + '/' + roomList[indexOfRoom].maxPlayer,
            class: 'currentAndMaxPlayer'
        }).appendTo($('#' + tempTagId));
        //게임세대
        $('<p>', {
            text: roomList[indexOfRoom].generationOfGame,
            class: 'generationOfGame'
        }).appendTo($('#' + tempTagId));
        //룰A
        $('<p>', {
            text: roomList[indexOfRoom].ruleA,
            class: 'ruleA'
        }).appendTo($('#' + tempTagId));
        //룰B
        $('<p>', {
            text: roomList[indexOfRoom].ruleB,
            class: 'ruleB'
        }).appendTo($('#' + tempTagId));

        //roomList에 추가
        $('#' + tempTagId).appendTo('#roomList');
    }

    // 로비 화면에서 roomList의 데이터로 DOM생성해 화면에 추가
    function showRooms() {
        for (var howManyRooms in roomList) {
            var tempTagId = 'room' + roomList[howManyRooms].roomNumber;
            //div.roomSummary#room27 추가
            //border는 임시로 넣어둔 것으로 디자이너님이 빼세여!!

            makeDOMForRoom(roomList, tempTagId, howManyRooms);

            //click 이벤트 연결(event enterRoom을 발생시킴)
            //클로저때문에 익명함수로 구현함
            //m이 내부 값
            //i가 m에 들어갈 외부 값
            (function(m) {
                $('#' + m).click(function() {
                    var tempRoomNumber = m.substring(4, 7);
                    var tempObjectToSend = {
                        selectedRoom: tempRoomNumber,
                        nickname: nickname
                    };
                    socket.emit("enterRoom", tempObjectToSend);
                });
            })(tempTagId);

        }
    }

    function showMoreRooms(additionalRoomlist) {
        for (var howManyRooms in additionalRoomlist) {
            var tempTagId = 'room' + additionalRoomlist[howManyRooms].roomNumber;
            //div.roomSummary#room27 추가
            //border는 임시로 넣어둔 것으로 디자이너님이 빼세여!!
            makeDOMForRoom(additionalRoomlist, tempTagId, howManyRooms);
            //click 이벤트 연결(event enterRoom을 발생시킴)
            //클로저때문에 익명함수로 구현함
            //m이 내부 값
            //i가 m에 들어갈 외부 값
            (function(m, n) {
                $('#' + m).click(function() {
                    var tempRoomNumber = m.substring(4, 7);
                    var tempObjectToSend = {
                        selectedRoom: tempRoomNumber,
                        nickname: nickname
                    };
                    socket.emit("enterRoom", tempObjectToSend);
                });
                //객체를 roomList에 추가한다
                roomList.push(additionalRoomlist[n]);
            })(tempTagId, howManyRooms);
        }
    }

    // 방에 입장하면 방으로 이동
    function showRoom(currentRoom) {
        $('#lobby').remove();
        makeDOMForCurrentRoom(currentRoom);

    }

    // 방에 입장하면 방의 DOM 생성
    function makeDOMForCurrentRoom(currentRoom) {
        //currentRoom div생성
        $('<div>', {
            id: 'currentRoom'
        }).appendTo($('body'));

        //roomInfo div생성
        $('<div>', {
            id: 'roomInfo'
        }).appendTo($('#currentRoom'));

        //방번호추가
        $('<p>', {
            text: '* Room' + currentRoom.roomNumber,
            class: 'roomNumberForCurrentRoom'
        }).appendTo($('#roomInfo'));

        //방제목추가
        $('<p>', {
            text: '* Title : ' + currentRoom.roomName,
            class: 'roomNameForCurrentRoom'
        }).appendTo($('#roomInfo'));

        //현재인원/최대인원 추가
        $('<p>', {
            text: '* Capacity : ' + currentRoom.currentPlayer + '/' + currentRoom.maxPlayer,
            class: 'currentAndMaxPlayerForCurrentRoom'
        }).appendTo($('#roomInfo'));

        //게임세대 추가
        $('<p>', {
            text: '* Generation : ' + currentRoom.generationOfGame,
            class: 'generationOfGameForCurrentRoom'
        }).appendTo($('#roomInfo'));

        //룰A 추가
        $('<p>', {
            text: '* RuleA : ' + currentRoom.ruleA,
            class: 'ruleAForCurrentRoom'
        }).appendTo($('#roomInfo'));

        //룰B 추가
        $('<p>', {
            text: '* RuleB : ' + currentRoom.ruleB,
            class: 'ruleBForCurrentRoom'
        }).appendTo($('#roomInfo'));

        //플레이어1 추가
        $('<p>', {
            text: '* Player1 : ' + currentRoom.player1,
            class: 'userName',
            id: 'player1Name'
        }).appendTo($('#currentRoom'));

        //플레이어2 추가
        $('<p>', {
            text: '* Player2 : ' + currentRoom.player2,
            class: 'userName',
            id: 'player2Name'
        }).appendTo($('#currentRoom'));

        if (currentRoom.maxPlayer == 4) {
            //플레이어3 추가
            $('<p>', {
                text: '* Player3 : ' + currentRoom.player3,
                class: 'userName',
                id: 'player3Name'
            }).appendTo($('#currentRoom'));

            //플레이어4 추가
            $('<p>', {
                text: '* Player4 : ' + currentRoom.player4,
                class: 'userName',
                id: 'player4Name'
            }).appendTo($('#currentRoom'));
        }

        //selectedPokemon div생성
        $('<div>', {
            id: 'player1Pokemon',
            class: 'selectedPokemon'
        }).appendTo($('#currentRoom'));

        //selectedPokemon div생성
        $('<div>', {
            id: 'player2Pokemon',
            class: 'selectedPokemon'
        }).appendTo($('#currentRoom'));

        if (currentRoom.maxPlayer == 4) {
            //selectedPokemon div생성
            $('<div>', {
                id: 'player3Pokemon',
                class: 'selectedPokemon'
            }).appendTo($('#currentRoom'));
            //selectedPokemon div생성
            $('<div>', {
                id: 'player4Pokemon',
                class: 'selectedPokemon'
            }).appendTo($('#currentRoom'));
        }

        //게임 시작 버튼 생성
        $('<button>', {
            id: 'gameStart',
            text: 'gameStart'
        }).appendTo($('#currentRoom'));

        //chattingBoxBackground div생성
        $('<div>', {
          id : 'chattingBoxBackground',
          style: 'height:150px;  border:1px solid black; position:relative;'
        }).appendTo($('#currentRoom'));
        //chattingbox div생성
        $('<div>', {
            id: 'chattingBox',
            style: 'overflow:scroll; height:100%; background-color: rgba( 255, 255, 255, 0 );'
        }).appendTo($('#chattingBoxBackground'));






        //keyboardandpokemon div생성
        $('<div>', {
            id: 'keyboardAndPokemonSelect'
        }).appendTo($('#currentRoom'));


        // keyboardSelect div 내용물
        $('<div>', {
            id: 'keyboardSelect',
            style: 'display:table; width:100%;'
        }).appendTo($('#keyboardAndPokemonSelect'));

        //keyboard <-> pokemon 전환버튼
        $('<button>', {
            id: 'switchKeyboardAndPokemon',
            text: '*',
            style: 'display:table-cell; width:25px;'
        }).appendTo($('#keyboardSelect'));
        $('<input>', {
            id: 'userTyping',
            type: 'text',
            style: 'display:table-cell; width:calc(100% - 75px)'
        }).appendTo($('#keyboardSelect'));
        $('<button>', {
            id: 'userSubmit',
            text: 'enter',
            style: 'display:table-cell; width:40px;'
        }).appendTo($('#keyboardSelect'));
        //input하나만 있을때 enter로 submit되는거 막기 위한 더미
        $('<input>', {
            id: 'dummyInput',
            type: 'text',
            style: 'display:none;'
        }).appendTo($('#keyboardSelect'));


        // pokemonSelect div 내용물
        $('<div>', {
            id: 'pokemonSelect',
            style: 'display:none; border:1px solid red; max-height:150px;'
        }).appendTo($('#keyboardAndPokemonSelect'));



        //세대 선택
        $('<div>', {
            id: 'selectGeneration',
            style: 'width:25px; display: table-cell;'
        }).appendTo($('#pokemonSelect'));
        //포켓몬 박스를 감싸는 더미
        $('<div>', {
            id: 'dummyContainsPokemonBox',
            style: 'width : 100%; height:100%; border:1px solid black; display:table-cell'
        }).appendTo($('#pokemonSelect'));
        //포켓몬박스
        $('<div>', {
            id: 'pokemonBox',
            style: 'overflow:scroll; width:100%; height:100%;border:1px solid green; display:block; '
            //원래 display: table-cell이었음
        }).appendTo($('#dummyContainsPokemonBox'));

        $('<button>', {
            id: 'generation1',
            text: '1'
        }).appendTo($('#selectGeneration'));
        $('<br>').appendTo($('#selectGeneration'));
        $('<button>', {
            id: 'generation2',
            text: '2'
        }).appendTo($('#selectGeneration'));
        $('<br>').appendTo($('#selectGeneration'));
        $('<button>', {
            id: 'generation3',
            text: '3'
        }).appendTo($('#selectGeneration'));
        $('<br>').appendTo($('#selectGeneration'));
        $('<button>', {
            id: 'generation4',
            text: '4'
        }).appendTo($('#selectGeneration'));
        $('<br>').appendTo($('#selectGeneration'));
        $('<button>', {
            id: 'generation5',
            text: '5'
        }).appendTo($('#selectGeneration'));
        $('<br>').appendTo($('#selectGeneration'));
        $('<button>', {
            id: 'generation6',
            text: '6'
        }).appendTo($('#selectGeneration'));
        $('<br>').appendTo($('#selectGeneration'));
        $('<button>', {
            id: 'generation7',
            text: '7'
        }).appendTo($('#selectGeneration'));

        // 버튼1 이벤트 연결
        $('#generation1').click(function() {
            clearPokemonBox();
            getPokemonList('generation1', '#pokemonBox');
            $("#pokemonBox").scrollTop(0);
        });
        // 버튼2 이벤트 연결
        $('#generation2').click(function() {
            clearPokemonBox();
            getPokemonList('generation2', '#pokemonBox');
            $("#pokemonBox").scrollTop(0);
        });
        // 버튼3 이벤트 연결
        $('#generation3').click(function() {
            clearPokemonBox();
            getPokemonList('generation3', '#pokemonBox');
            $("#pokemonBox").scrollTop(0);
        });
        // 버튼4 이벤트 연결
        $('#generation4').click(function() {
            clearPokemonBox();
            getPokemonList('generation4', '#pokemonBox');
            $("#pokemonBox").scrollTop(0);
        });
        // 버튼5 이벤트 연결
        $('#generation5').click(function() {
            clearPokemonBox();
            getPokemonList('generation5', '#pokemonBox');
            $("#pokemonBox").scrollTop(0);
        });
        // 버튼6 이벤트 연결
        $('#generation6').click(function() {
            clearPokemonBox();
            getPokemonList('generation6', '#pokemonBox');
            $("#pokemonBox").scrollTop(0);
        });
        // 버튼7 이벤트 연결
        $('#generation7').click(function() {
            clearPokemonBox();
            getPokemonList('generation7', '#pokemonBox');
            $("#pokemonBox").scrollTop(0);
        });



        // 키보드 이벤트 연결
        setKeyboardUI();

        // switchKeyboardAndPokemon 이벤트
        $('#switchKeyboardAndPokemon').click(function() {
            var tempString = "";

            //현재 keyboard이고 pokemonbox불러온적 없을 경우 pokemonbox불러오고 pokemon검색으로 변경
            //pokemon UI
            if (currentUI == "keyboard" && pokemonBoxHasBeenCalled === false) {
                $('#pokemonSelect').css("display", "table-row");
                // UI구현
                setPokemonUI();
                // 검색 불러옴
                setPokemonSearch();
                // currentUI 변수 변경
                tempString = 'pokemon';
                pokemonBoxHasBeenCalled = true;
                console.log("current : 1");
            }

            // 현재 keyboard이고 pokemonbox불러온적 있을경우 pokemon검색만 변경
            if (currentUI == "keyboard" && pokemonBoxHasBeenCalled === true) {
                console.log("current : 2");
                // 검색 불러옴
                setPokemonSearch();

                tempString = 'pokemon';
            }

            //현재 pokemon일 경우 keyboard로 변경
            //keyboard UI
            if (currentUI == "pokemon") {
                // UI구현(이벤트연결)
                setKeyboardUI();
                console.log("current : 3");
                // currentUI 변수 변경
                tempString = 'keyboard';
            }

            currentUI = tempString;

            console.log('currentUI : ' + currentUI);
            console.log('pokemonBoxHasBeenCalled : ' + pokemonBoxHasBeenCalled);
        });

        $('<div>', {
            id: 'footer',
            style: 'clear:left;'
        }).appendTo($('#keyboardAndPokemonSelect'));


        //exit button생성
        $('<button>', {
            id: 'currentRoomExit',
            text: 'exit'
        }).appendTo($('#footer'));


        document.getElementById('currentRoomExit').onclick = function() {
            console.log('exit currentRoom');
            console.log('currentRoom Roomnumber : ' + currentRoom.roomNumber);
            var tempObjectToSend = {
                roomNumber: currentRoom.roomNumber,
                whoKicks: nickname,
                kickWho: nickname
            };
            socket.emit('kickRequest', tempObjectToSend);
        };


    }

    // keyboardUI 설정
    function setKeyboardUI() {
        // 박스없앰
        //$('#pokemonSelect').css("display", "none");

        //채팅 보내는 event
        this.innerFunction1 = function() {
            var tempObjectToSend = {
                nickname: nickname,
                message: $('#userTyping').val(),
                roomNumber: currentRoom.roomNumber
            };
            socket.emit('sendMessage', tempObjectToSend);
            $('#userTyping').val("");
        };

        // 아이콘 설정
        $('#switchKeyboardAndPokemon').text("C");

        // UI구현
        // enter누르면 event sendMessage를 발생
        $("#userTyping").unbind('keypress');
        $("#userTyping").keypress(function(e) {
            if (e.keyCode == 13) {
                //채팅 보내는 event
                innerFunction1();
            }
        });
        // button userSubmit누르면 event sendMessage를 발생
        $('#userSubmit').unbind('click');
        $('#userSubmit').click(function() {
            //채팅 보내는 event
            innerFunction1();
        });
    }

    // pokemonUI 설정(포켓몬 박스 불러옴)
    function setPokemonUI() {
        // 포켓몬박스 비움
        clearPokemonBox();
        // 1세대 포켓몬 리스트 가져옴(default)
        getPokemonList('generation1', '#pokemonBox');
    }

    // pokemonUI 에서 포켓몬 불러오는 함수
    function getPokemonList(condition, DOMtoAddPokemon) {
        var indexNumber = 0;

        if (condition == 'generation1') {
            for (indexNumber = 1; indexNumber <= 151; indexNumber++) {
                //onsole.log('추가된 포켓몬의 인덱스 : ' + csv[indexNumber][1]);
                makeDOMForPokemonList(csv[indexNumber][1], DOMtoAddPokemon);
            }
        } else if (condition == 'generation2') {
            for (indexNumber = 152; indexNumber <= 251; indexNumber++) {
                //console.log('추가된 포켓몬의 인덱스 : ' + csv[indexNumber][1]);
                makeDOMForPokemonList(csv[indexNumber][1], DOMtoAddPokemon);
            }
        } else if (condition == 'generation3') {
            for (indexNumber = 252; indexNumber <= 389; indexNumber++) {
                //console.log('추가된 포켓몬의 인덱스 : ' + csv[indexNumber][1]);
                makeDOMForPokemonList(csv[indexNumber][1], DOMtoAddPokemon);
            }
        } else if (condition == 'generation4') {
            for (indexNumber = 390; indexNumber <= 505; indexNumber++) {
                //console.log('추가된 포켓몬의 인덱스 : ' + csv[indexNumber][1]);
                makeDOMForPokemonList(csv[indexNumber][1], DOMtoAddPokemon);
            }
        } else if (condition == 'generation5') {
            for (indexNumber = 506; indexNumber <= 670; indexNumber++) {
                //console.log('추가된 포켓몬의 인덱스 : ' + csv[indexNumber][1]);
                makeDOMForPokemonList(csv[indexNumber][1], DOMtoAddPokemon);
            }
        } else if (condition == 'generation6') {
            for (indexNumber = 671; indexNumber <= 743; indexNumber++) {
                //console.log('추가된 포켓몬의 인덱스 : ' + csv[indexNumber][1]);
                makeDOMForPokemonList(csv[indexNumber][1], DOMtoAddPokemon);
            }
        } else if (condition == 'generation7') {
            for (indexNumber = 744; indexNumber <= 848; indexNumber++) {
                //console.log('추가된 포켓몬의 인덱스 : ' + csv[indexNumber][1]);
                makeDOMForPokemonList(csv[indexNumber][1], DOMtoAddPokemon);
            }
        }
    }

    function setPokemonSearch() {
        //아이콘 변경
        $('#switchKeyboardAndPokemon').text("P");


        this.innerFunction1 = function() {
            //검색결과 저장할 배열
            //검색결과의 인덱스만을 저장함
            var tempArrayForSearchResult = [];
            //for문 돌면서 검색
            for (var tempIndex = 1; tempIndex < maxIndex; tempIndex++) {
                if (csv[tempIndex][4].indexOf($('#userTyping').val()) != -1) {
                    tempArrayForSearchResult.push(tempIndex);
                }
            }
            //박스 비우고
            clearPokemonBox();
            //DOM 추가
            for (tempIndex in tempArrayForSearchResult) {
                makeDOMForPokemonList(tempArrayForSearchResult[tempIndex], '#pokemonBox');
            }
        };

        // UI구현
        // enter누르면 event sendMessage를 발생
        $("#userTyping").unbind('keypress');
        $("#userTyping").keypress(function(e) {
            if (e.keyCode == 13) {
                //채팅 보내는 event
                innerFunction1();
            }
        });
        // button userSubmit누르면 event sendMessage를 발생
        $('#userSubmit').unbind('click');
        $('#userSubmit').click(function() {
            //채팅 보내는 event
            innerFunction1();
        });
    }

    // function getPokemonList()에서 DOM생성해주는 부분 따로 함수로 뺌
    function makeDOMForPokemonList(pokemonNumber, DOMtoAddPokemon) {

        $('<span>', {
            id: 'pokemon' + pokemonNumber,
            style: 'display : inline-block; width:32px; height:32px; text-align : center;'
        }).appendTo($(DOMtoAddPokemon));
        $('<img>', {
            src: '/images/small/' + pokemonNumber + '.png',
            style: 'aligen : center;'
        }).appendTo($('#pokemon' + pokemonNumber));

        //클릭시 이벤트 연결
        $('#pokemon' + pokemonNumber).unbind('click');
        $('#pokemon' + pokemonNumber).click(function() {
            console.log("??");

            //기존의 :before CSS 삭제
            $('.chattingBoxBackground').remove();
            $( '<style class="chattingBoxBackground" type="text/css"> #chattingBoxBackground:before {content: ""; top:0; left:0; width:100%; height:100%;display:block;position:absolute; opacity:0.5; z-index:-1; background: url(/images/large/' + pokemonNumber + '.png); background-repeat:no-repeat; background-size:120px; background-position:center;}</style>').appendTo("head");
        });
    }

    // pokemonBox 비우기
    function clearPokemonBox() {
        $('#pokemonBox').empty();
    }

    // currentRoom에서 로비로 이동
    function goToLobbyFromCurrentRoom() {
        $('#currentRoom').remove();
        //포켓몬 박스 변수 초기화
        pokemonBoxHasBeenCalled = false;
        //:before CSS 삭제
        $('.chattingBoxBackground').remove();

        socket.emit('goToLobby', browserSize);
    }

    // 방에서 다른 사람이 강퇴당함
    function otherUserExit(whoKicked) {
        //객체에서 제거
        if (currentRoom.player1 == whoKicked) {
            currentRoom.player1 = "";
        } else if (currentRoom.player2 == whoKicked) {
            currentRoom.player2 = "";
        } else if (currentRoom.player3 == whoKicked) {
            currentRoom.player3 = "";
        } else if (currentRoom.player4 == whoKicked) {
            currentRoom.player4 = "";
        } else {
            console.log('error : no one to kick in here');
        }
        //html 업데이트
        $('#player1name').text(currentRoom.player1);
        $('#player2name').text(currentRoom.player1);
        $('#player3name').text(currentRoom.player1);
        $('#player4name').text(currentRoom.player1);
    }
};
