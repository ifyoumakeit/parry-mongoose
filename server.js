var bodyParser                = require("body-parser"),
    express                   = require("express"),
    mongoose                  = require('mongoose'),
    Models                    = require("./model"),
    settings                  = require('./settings');

    // Models

    mongoose.connect(process.env.MONGOLAB_URI, (error) => {
      if (error) console.error(error);
      else console.log('mongo connected');
    });

    express()
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))

    .get("/api", (req, res) => {
      res.json(200, {msg: "OK" });
    })

    ////////////////////////////////////////////////////////////////////////////
    // HIPCHAT

    .post("/api", (req, res) => {

      var printSuccess = (message) => {
        return res.status(200).json({
          "color": "green",
          "message": `(successful) ${message}`,
          "notify": false,
          "message_format": "text"
        });
      },
      printError = (message) => {
        return res.status(200).json({
          "color": "red",
          "message": `(failed) ${message}`,
          "notify": true,
          "message_format": "text"
        });
      },
      printMsg = (msgSuccess, msgError, err) => {
        return err ? printError(msgError) : printSuccess(msgSuccess);
      }

      // Make sure data is there
      try {
        var command = settings.command;

        // Message data
        var messageObj = req.body.item.message,
          message = messageObj.message.substr(command.length + 1),
          userId = messageObj.from.id,
          userName = messageObj.from.name,
          userMentionName = messageObj.from.mention_name;
          words = message.split(" "),
          action = words.shift();

        // Room data
        var roomObj = req.body.item.room,
            roomId = roomObj.id,
            roomName = roomObj.name;

        // Date data
        var date = new Date(),
            now = new Date(),
            today5PM = date.setUTCHours(17, 0 , 0, 0),
            yesterday5PM = date.setUTCDate(date.getUTCDate() - 1)
            twodaysago5PM = date.setUTCDate(date.getUTCDate() - 1)
            tomorrow5PM = date.setUTCDate(date.getUTCDate() + 3);


      } catch(err) {
        printError(`Malformed request. ${err}`)
      }

      if(messageObj.message.substr(0, command.length) !== command){
        printError(`${command} must be at beginning of line.`)
      }

      Models.room.findOneAndUpdate({id: roomId}, {name: roomName}, {upsert: true, new: true}, (err, room) => {

        var findUser = (funcSuccess, funcError) => {
          var userIndex = room.users.findIndex((user) => { return user.id === userId; })
          if(userIndex > -1){
            return funcSuccess(userIndex);
          } else {
            if(typeof funcError === "function") {
              return funcError(userIndex);
            }
            else {
              return printError(`${userMentionName} not a member`);
            }
          }
        }

        switch(action){

          case "req.body":
            printSuccess(JSON.stringify(req.body, null, 2))
            break

          case "":
          case "help":
            printSuccess(`Available commands:

                join {email}
                update {email}
                leave
                post {url}
                repost {url}
                current
                previous
                mine
                me
            `);
            break;

          case "join":
          case "update":

            var email = words[0];

            if(!email){
              printError("Missing email");
              return;
            }

            var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if(!re.test(email)){
              printError("Email invalid");
              return;
            }

            findUser((userIndex) => {
              var user = room.users[userIndex];
              user.email = email;
              user.name = userName;
              user.mentionName = userMentionName;
              room.save(printMsg.bind(this, `${userMentionName} updated`, `${userMentionName} update failed`));
            },(user) => {
              // Add user
              room.users.push(new Models.user({
                "email": email,
                "id": userId,
                "name": userName,
                "mention_name": userMentionName
              }))
              room.save(printMsg.bind(this, `${userMentionName} added to ${roomName}`, `${userMentionName} add failed`));
            });
            break;

          case "leave":
            findUser((userIndex) => {
              // Remove user
              room.users.splice(userIndex, 1);
              room.save(printMsg.bind(this, `${userMentionName} left ${roomName}`, `${userMentionName} update failed`));
            });
            break;

          case "post":
          case "repost":
            var url = words.shift(),
                description = words.join(" ");

            if(!url){
              printError("Missing link");
              return;
            }

            var re = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
            if(!re.test(url)){
              printError("Link invalid");
              return;
            }

            findUser((userIndex) => {
              var user = room.users[userIndex];
              var linkIndex = user.links.findIndex((link) => { return link.url === url });
              if(linkIndex === -1 || action === "repost"){
                user.links.push(new Models.link({
                  "url": url,
                  "description": description
                }));
                room.save(printMsg.bind(this, `${userMentionName} ${action}ed ${url}`, `${userMentionName} ${action} failed`));
              } else {
                printError(`${url} already posted, use repost to force`);
              }
            });
            break;

          case "current":
          case "previous":
            if(room.users.length){

              var range = {};
              if(action === "previous") {
                range = now < today5PM ? [twodaysago5PM, yesterday5PM] : [yesterday5PM, today5PM];
              } else {
                range = now < today5PM ? [yesterday5PM, today5PM] : [today5PM, tomorrow5PM];
              }

              var output = room.users.reduce((memo, user) => {
                var links = user.links.reduce((links, link) => {
                  var date = link.createdAt.getTime();
                  return date < range[0] || date > range[1] ? links : `${links} \n ${link.url}`;
                }, '');

                return links !== '' ? `${memo} \n ${user.mentionName} ${links}` : memo;
              }, '');

              if(output !== '') {
                printSuccess(`${action} digest: ${output}`);
              } else {
                printError(`No links in ${action} digest`);
              }

            } else {
              printError(`No users in room.`);
            }
            break;

          case "mine":
            findUser((userIndex) => {
              var user = room.users[userIndex];
              var range = range = now < today5PM ? [yesterday5PM, today5PM] : [today5PM, tomorrow5PM];
              if(user.links.length){
                var output = user.links.reduce((links, link, index) => {
                  var date = link.createdAt.getTime();
                  var hours = link.createdAt.getHours();
                  var time = hours > 12 ? `${hours - 12}:${link.createdAt.getMinutes()} PM` : `${hours}:${link.createdAt.getMinutes()} AM`;
                  return date < range[0] || date > range[1] ? links : `${links} ${link.url} @ ${time}\n`;
                }, '');
                printSuccess(`Current links:\n ${output}`);
              } else {
                printError(`Nothing posted today.`);
              }
            });
            break;

          case "me":
            findUser((userIndex) => {
              var user = room.users[userIndex];
              printSuccess(`Your infomation:
              Name: ${userName}
              Mention Name: ${userMentionName}
              Email: ${user.email}
              Links: ${user.links.length}
              `);
            });
            break;

          default:
            printError(`Action '${action}' is not valid`);

        }
      });

    })
    .use(express.static(__dirname + "/"))
    .listen(process.env.PORT || 5000);
