var http = require('http');
var fs = require('fs');
var crypto = require('crypto');
var qs = require('querystring');
var nodemailer = require('nodemailer');
const url = require('url');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var moment = require("moment");
//URLS
var mongoURL = 'mongodb://localhost:27017/parking';
var public_website = 'http://localhost:8000';
var private_website = 'http://localhost:8001';
//URLS END HERE


function mongoRegister(object) {
    MongoClient.connect(mongoURL, function(err, db) {
        if (err) {
            console.log("An error took place while performing a registration. Error:", err);
        } else {
            var collection = db.collection('test');
            collection.insert(object, function (err, result) {
                if (err) {
                    console.log("An error took place while inserting data into collection. Error:", err);
                } else {
                    console.log("Inserted %d documents into the collection 'test'. Results:", result.insertedCount, result);
                }
                db.close();
            });
        }
    })
}

function mongoVerify(hash) {
    MongoClient.connect(mongoURL, function(err, db) {
        if (err) {
            console.log("An error took place while performing a verification. Error:", err);
        } else {
            var collection = db.collection('test');
         collection.findOne({sha1hash: {$eq: hash}}, function (err, document) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(document);
                    document["timestamp"] = new Date();
                    db.collection('awaiting_verified').insert(document, function (err, result) {
                        if (err) {
                            console.log("An error took place while inserting data into collection. Error:", err);
                        } else {
                            console.log("Inserted %d documents into the collection 'test'. Results:", result.insertedCount, result);
                        }
                    });
                }
            });
            collection.remove({sha1hash: {$eq: hash}}, function(err, result) {
                if (err) {
                    console.log("Error:", err);
                } else {
                    console.log(result);
                    db.close();
                }
            });
        //collection.remove({sha1hash: {$eq: hash}});
        }
    });
    console.log('A request with a hash ' + hash + ' has been verified successfully!');
}




function extractGet(req) {
    var url_parts = url.parse(req.url, true);
    return url_parts.query;
}


//var html = fs.readFileSync('index.html');  // User website itself


// Crypto verification hash starts here

     /* Probably*/                                  function generateHash(id_num) {
     /*won't use it*/                                   var seed = crypto.randomBytes(20);
                                                        var authToken = crypto.createHash('sha1').update(seed + id_num).digest('hex');
                                                        return authToken;
                                                    }

// Crypto verification hash ends here


// Email sending stuff starts here

                        // NODEMAILER STARTS HERE

                        let transporter = nodemailer.createTransport( {
                            service: 'gmail',
                            auth: {
                                user: 'demezhan1998@gmail.com',
                                pass: process.env.MAILERPASSWORD
                            }
                        }
                        );



                        function emailLink(data) {

                            let mailOptions = {
                            from: '"Reception" <reception@nu.edu.kz>', // sender address
                            to: data.email, // list of receivers
                            subject: 'Car entrance verification', // Subject line
                            text: 'text?', // plain text body
                            html: "<b>Hi there!</b> <br> You've sent a request for the entrance of car with number " +data.car_num + '<br> To complete the verification push the button below <br>' + '<a href="'+public_website+'/verid?='.concat(data.sha1hash) + '"><button>Verify</button></a>' // html body
                            };

                            transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                            console.log('Message %s sent: %s', info.messageId, info.response);
                        });

                        }

                        // NODEMAILER ENDS HERE





function SendVerificationLink(req, res) {

    var body = '';
    req.on('data', function(chunk) {
      body += chunk;
    });
    req.on('end', function() {
      var data = qs.parse(body);
      // now you can access `data.email` and `data.password`
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end('<h1><b>Confirmation letter has been sent!</b></h1> <br> <meta http-equiv="refresh" content="3;url='+public_website+'" /> <br> <h3>You will be redirected to the homepage soon..</h3>');
     data["sha1hash"] = generateHash(data.email);
     emailLink(data);
     mongoRegister(data);
      //res.end(JSON.stringify(data));
    });

    console.log("Verification link sent, sir!");
  }

function redirectToHome(res) {
    res.writeHead(302, {'Location': '/'});
    res.end();
    console.log('HTTP connection redirected to homepage');
}

var public_server = http.createServer(function(req,res) {

    if (req.method === 'POST' && req.url === '/register') {

        SendVerificationLink(req, res);
    }
    else if (req.method === 'GET' && req.url.substring(0,6) === '/verid' /* && req.url.length === 47 */ ){
        console.log('Verification?');
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('<i><h1>Verification done!</h1></i>');

        mongoVerify(Object.values(extractGet(req))[0]);
}


    else if (req.url != '/') {
        console.log("An attempt has been made to connect to "+req.url+". Redirecting..");
        redirectToHome(res);
    }


    else {
        console.log("New connection");
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(fs.readFileSync('public_website/publicindex.html'));
    }
});


public_server.listen(8000, () => {
    console.log("Public Server is up and running, commander!");
});



// PRIVATE SERVER CODE STARTS HERE

var private_server = http.createServer(function(req,res) {
    var pathname = url.parse(req.url).pathname;
    console.log("PATHNAME: " + pathname);
    if (req.method === 'POST' && req.url ==='/auth') {
        var body = '';
        req.on('data', function(chunk) {
            body += chunk;
        });
        req.on('end', function() {
            var data = qs.parse(body);

            MongoClient.connect(mongoURL, function(err, db) {
                if (err) {
                    console.log("An error occured while authorizing into private server. Error:", err);
                } else {
                    var collection = db.collection('personnel');
                collection.findOne({login: {$eq: data.login}, password: {$eq: data.pass}}, function(err, document){
                    if (err) {
                        console.log("An error occured while authorizing personnel authentication. Error:", err);
                    } else if (document != undefined) {
                        console.log(document);
                        res.writeHead(200);
                        res.end(fs.readFileSync('private_website/authorized_panel.html'));
                    } else {
                        res.writeHead(401, {'Content-Type': 'text/html; charset=utf-8'});
                        res.end("<b>Логин/Пароль не верны</b><br><p>Вы будете возвращены на главную</p> <meta http-equiv='refresh' content='3;url=".concat(private_website)+"' />");
                    }
                });
                db.close();
                }
            });

        });



    }

    else if(req.method === 'POST' && req.url === '/decide') {
        console.log("DECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDEDECIDE");
        var body = '';
        req.on('data', function(chunk) {
            body += chunk;
        });
        req.on('end', function() {
            var data = qs.parse(body);
            data = JSON.parse(JSON.stringify(data));
            data = JSON.parse(data.json);
            console.log(data);
            console.log(data.allow);
            console.log(typeof(data.id));
            MongoClient.connect(mongoURL, function(err, db) {
                if (err) {
                    console.log("An error took place while performing a verification. Error:", err);
                } else {
                    var collection = db.collection('awaiting_verified');

                        if(data.allow) {
                            collection.findOne({"_id": mongodb.ObjectID(data.id)}, function (err, document) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log("Document" + document);
                                    db.collection('awaiting_confirmed').insert(document, function (err, result) {
                                        if (err) {
                                            console.log("An error took place while inserting data into collection. Error:", err);
                                        } else {
                                            console.log("Inserted %d documents into the collection 'test'. Results:", result.insertedCount, result);
                                        }
                                    });
                                }
                            });
                        }

                    collection.remove({"_id": mongodb.ObjectID(data.id)}, function(err, result) {
                        if (err) {
                            console.log("Error:", err);
                        } else {
                            // console.log(result);
                            db.close();
                            res.writeHead(200);
                            res.end();
                        }
                    });
                //collection.remove({sha1hash: {$eq: hash}});
                }
            });

        });



    }

    else if (req.method === 'POST' && req.url === '/retrieve') {
        var body = '';
        req.on('data', function(chunk) {
            body += chunk;
        });
        req.on('end', function() {
            var data = qs.parse(body);
            // console.log("data: ~ " + JSON.stringify(data));

            var docs;

            /* Check if the object is empty */
            if(JSON.stringify(data).length == 2) {
                // Document on ready request

                testing().then(function(docs) {
                    console.log("DOCS " + JSON.stringify(docs));
                    res.writeHead(200);
                    res.write(JSON.stringify(docs));
                    res.end();
                });

            }
            else {

                console.log("testing");

                res.writeHead(200);
                res.end();

            }

            // var json = JSON.parse(data.json);

            // console.log("DATA REQUEST: " + json.time);






            /*
            MongoClient.connect(mongoURL, function(err, db) {
                if (err) {
                    console.log("An error occured while authorizing into private server. Error:", err);
                } else {
                    var collection = db.collection('personnel');
                collection.findOne({login: {$eq: data.login}, password: {$eq: data.pass}}, function(err, document){
                    if (err) {
                        console.log("An error occured while authorizing personnel authentication. Error:", err);
                    } else if (document != undefined) {
                        console.log(document);
                        res.writeHead(200);
                        res.end(fs.readFileSync('private_website/authorized_panel.html'));
                    } else {
                        res.writeHead(401, {'Content-Type': 'text/html; charset=utf-8'});
                        res.end("<b>Логин/Пароль не верны</b><br><p>Вы будете возвращены на главную</p> <meta http-equiv='refresh' content='3;url=".concat(private_website)+"' />");
                    }
                });
                db.close();
                }
            });*/

        });

    }
    else if(pathname.substring(0, 9) == "/scripts/") {
        var jsfname = pathname.substring(9, pathname.length);
        // console.log("REQUESTED JS FILE: " + jsfname);
        script = fs.readFileSync("private_website".concat(pathname), "utf8");
        res.write(script);
        res.end();
    }
    else {
        res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync('private_website/index.html'));
    }
});


private_server.listen(8001, () => {
    console.log("Private Server is up and running!");
})



function testing() {

        return new Promise(function(resolve, reject) {
            MongoClient.connect(mongoURL, function(err, db) {
                if (err) {
                    console.log("An error occured while authorizing into private server. Error:", err);
                    reject("An error has occured");
                } else {
                    var collection = db.collection('awaiting_verified');
                    collection.find().toArray(function(err, docs) {
                        console.log(typeof(docs));
                        db.close();
                        resolve(docs);
                    })
                }
        });
        })

}
