var bodyParser                = require("body-parser"),
    express                   = require("express"),
    Room                      = require("./model"),
    mongoose                  = require('mongoose'),
    _                         = require('lodash'),
    settings                  = require('./settings');

    // Models

    mongoose.connect(process.env.MONGOLAB_URI, function (error) {
      if (error) console.error(error);
      else console.log('mongo connected');
    });

    express()
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))

    .get("/api", function (req, res) {
      res.json(200, {msg: "OK" });
    })

    ////////////////////////////////////////////////////////////////////////////
    // HIPCHAT

    .post("/api/hipchat", function(req, res){

      var printSuccess = function(message){
        return res.status(200).json({
          "color": "green",
          "message": ":) " + message,
          "notify": false,
          "message_format": "text"
        });
      },
      printError = function(message){
        return res.status(200).json({
          "color": "red",
          "message": ":( " + message,
          "notify": false,
          "message_format": "text"
        });
      },
      printMsg = function(msgSuccess, msgError, err){
        console.log(arguments);
        return err ? printError(msgError) : printSuccess(msgSuccess);
      }

      // Make sure data is there
      try {
        var command = "/parry";

        var messageObj = req.body.item.message,
          message = messageObj.message.substr(command.length + 1),
          userId = messageObj.from.id,
          userName = messageObj.from.name,
          userMentionName = messageObj.from.mention_name;
          words = message.split(" "),
          action = words.shift();

        var roomObj = req.body.item.room,
            roomId = roomObj.id,
            roomName = roomObj.name;


      } catch(err) {
        printError("Malformed request. " + err)
      }



        switch(action){
          case "add":
            Room.findOne({id: roomId}, function(err, room){
              if(err){
                printError("Room error!")
              }

              if(!room.length){
                room.name = roomName;
                room.save(printMsg.bind("Room name added", "Room name failed"))
              } else {
                printError("Room not found!")
              }

            });
            break;

          case "update":
            Room.findOneAndUpdate({id: roomId}, {name: roomName}, {upsert: true},
              printMsg.bind("Room name updated", "Room name failed"));
            break;

          case "join":

            var email = words[0];

            if(_.isEmpty(email)){
              printError("Missing email");
              return;
            }

            var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if(!re.test(email)){
              printError("Email invalid");
              return;
            }

            var query = {
                  "id": roomId,
                  "users.id": userId
                },
                update = {
                  $push: {
                    "users": {
                      "email": email,
                      "id": userId,
                      "name": userName,
                      "mention_name": userName,
                    }
                  }
                },
                options = {
                  "safe": true,
                  "new": true,
                  "upsert": true
                };

            Room.findOneAndUpdate(query, update, options, function(err, room){
              if(err){
                console.log(err, "??");
              } else {
                console.log(room, "!!");
              }

              printSuccess("!");
            });

          break;
        }


    })
    .use(express.static(__dirname + "/"))
    .listen(process.env.PORT || 5000);
