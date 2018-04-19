#!/usr/bin/env node

var amqp = require('amqplib/callback_api');

var EventEmitter = require('events');
var prompt = new EventEmitter();

var exchangeName = 'doctor_ex';
var channelRef;
var diseases = ['hip', 'knee', 'elbow'];
var doctors = ["Adam Nowak", "Jan Kowalski"];
var queues;

var inputData = {};
var technicanList = [];
var count = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function Technican (name, spec1, spec2) {
    this.name = name;
    this.spec1 = spec1;
    this.spec2 = spec2;
    let that = this;
    this.getInfo = function() {
        return this.name;
    };
    this.consumeMsg = function() {
        channelRef.consume(spec1, async function(msg) {
          console.log("Technican %s with spec %s received %s", that.name, that.spec1, msg.content.toString());
          //await sleep(10000);
          //console.log("ready");
          that.sendMsgBack(msg);
      }, {noAck: true});
        channelRef.consume(spec2, async function(msg) {
          console.log("Technican %s with spec %s received %s", that.name, that.spec2, msg.content.toString());
          //await sleep(10000);
          //console.log("ready");
          that.sendMsgBack(msg);
      }, {noAck: true});
    }
    this.sendMsgBack = function(msg) {
        let arr = msg.content.toString().split(',');
        let doctorName = arr[0];
        let patientName = arr[1];
        let disease = arr[2];
        let new_msg = patientName + " " + disease + " done";
        console.log("Sending back to%smessage : %s", doctorName, new_msg);

        channelRef.publish(exchangeName, doctorName, new Buffer(new_msg));
    }

}


function initConnection() {
    return new Promise((resolve, reject) => {
        amqp.connect('amqp://localhost', function(err, conn) {
          conn.createChannel(function(err, ch) {
            ch.assertExchange(exchangeName, 'direct', {durable: true});
            ch.prefetch(1);

            ch.assertQueue(diseases[0], {exclusive: true}, function(err, q) {
              ch.bindQueue(q.queue, exchangeName, diseases[0]);
            });

            ch.assertQueue(diseases[1], {exclusive: true}, function(err, q) {
              ch.bindQueue(q.queue, exchangeName, diseases[1]);
            });

            ch.assertQueue(diseases[2], {exclusive: true}, function(err, q) {
              ch.bindQueue(q.queue, exchangeName, diseases[2]);
            });

            ch.assertQueue(doctors[0], {exclusive: false}, function(err, q) {
              ch.bindQueue(q.queue, exchangeName, doctors[0]);
            });

            ch.assertQueue(doctors[1], {exclusive: false}, function(err, q) {
              ch.bindQueue(q.queue, exchangeName, doctors[1]);
            });

            resolve(ch);
            reject(err);
          });
        });
    });
}

process.stdin.resume();

process.stdin.on('data', function(data){
  prompt.emit(current, data.toString().trim());
});

prompt.on(':new', function(name, question){
  current = name;
  console.log(question);
  process.stdout.write('> ');
});

prompt.on(':end', function(){
    process.stdout.write('> ');

});

prompt.on('name', function(data){
  inputData['name'] = data;
  prompt.emit(':new', 'spec1', 'What is the name of the first spec?');
});

prompt.on('spec1', function(data){
  inputData['name'] = data;
  prompt.emit(':new', 'spec2', 'What is the name of the second spec?');
});

prompt.on('spec2', function(data){
  inputData['spec2'] = data;

  let tech = new Technican(inputData.name, inputData.spec1, inputData.spec2);
  technicanList.push(tech);
  tech.consumeMsg();
  inputData = {};
  count++;
  if(count == 1) {
      setTimeout(function() { process.exit(0) }, 1000000);
  } else {
    prompt.emit(':new', 'name', 'What is the name of technican?');
  }
});

//demo
initConnection().then(function(channel) {
    channelRef = channel;
    console.log("Waiting for messages...");
    let tech0 = new Technican("techniczny1", "knee", "elbow");
    let tech1 = new Technican("techniczny2", "knee", "hip");
    tech0.consumeMsg();
    tech1.consumeMsg();
})
