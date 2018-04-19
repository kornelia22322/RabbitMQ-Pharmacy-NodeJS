#!/usr/bin/env node
var amqp = require('amqplib/callback_api');

var EventEmitter = require('events');
var prompt = new EventEmitter();
var inputData = {};

var exchangeName = 'doctor_ex';
var channelRef;

function Doctor (name) {
    this.name = name;
    let that = this;
    this.create = function() {
        //every doctor named his name
    }
    this.getInfo = function() {
        return this.name;
    };
    this.sendPatientWithDisease = function(patient, disease) {
        let msg = this.name+","+patient+","+disease;
        channelRef.publish(exchangeName, disease, new Buffer(msg));
        console.log("Hi, " + this.name + " sending " + patient + " with disease "
        + disease);
    }
    this.consumeMsg = function() {
        channelRef.consume(this.name, function(msg) {
          console.log("Doctor %s received back msg: %s", that.name, msg.content.toString());
        }, {noAck: true});
    }
    this.create();
    this.consumeMsg();
}

function initConnection() {
    return new Promise((resolve, reject) => {
        amqp.connect('amqp://localhost', function(err, conn) {
          conn.createChannel(function(err, ch) {
            ch.assertExchange(exchangeName, 'direct', {durable: true});
            ch.prefetch(1);

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
  process.stdin.pause();
});

prompt.on('name', function(data){
  inputData['name'] = data;
  prompt.emit(':new', 'patient', 'What is the name of the patient?');
});

prompt.on('patient', function(data){
  inputData['patient'] = data;
  prompt.emit(':new', 'disease', 'What is disease?');
});

prompt.on('disease', function(data){
  inputData['disease'] = data;
  let doctor_0 = new Doctor(inputData.name);
  doctor_0.sendPatientWithDisease(inputData.patient, inputData.disease);

  inputData = {};

  prompt.emit(':exit');

  setTimeout(function() { process.exit(0) }, 20000);
});

//demo
initConnection().then(function(channel) {
    channelRef = channel;
    prompt.emit(':new', 'name', 'What is the name of doctor?');
})
