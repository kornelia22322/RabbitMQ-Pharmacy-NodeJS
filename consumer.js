#!/usr/bin/env node

var amqp = require('amqplib/callback_api');

var exchangeName = 'doctor_ex';
var channelRef;
var diseases = ['hip', 'knee', 'elbow'];
var queues;

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
          console.log("ready");
          that.sendMsgBack(msg);
      }, {noAck: true});
        channelRef.consume(spec2, async function(msg) {
          console.log("Technican %s with spec %s received %s", that.name, that.spec2, msg.content.toString());
          //await sleep(10000);
          console.log("ready");
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

            ch.assertQueue("oj", {exclusive: false}, function(err, q) {
              ch.bindQueue(q.queue, exchangeName, "oj");
            });

            ch.assertQueue(diseases[1], {exclusive: true}, function(err, q) {
              ch.bindQueue(q.queue, exchangeName, diseases[1]);
            });

            ch.assertQueue(diseases[2], {exclusive: true}, function(err, q) {
              ch.bindQueue(q.queue, exchangeName, diseases[2]);
            });

            resolve(ch);
            reject(err);
          });
        });
    });
}

//demo
initConnection().then(function(channel) {
    channelRef = channel;
    console.log("Waiting for messages...");
    let tech0 = new Technican("1 techniczny", "knee", "elbow");
    let tech1 = new Technican("2 techniczny", "knee", "hip");
    tech0.consumeMsg();
    tech1.consumeMsg();
})
