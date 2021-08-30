import {Meteor} from 'meteor/meteor'
import { MeteorCamera } from 'meteor/mdg:camera';
let videoElement = document.getElementById('video');
let canvas = document.getElementById('canvas');
let blur = false;
let isbackground = false;
let content = ''
let recognition;




Template.Check.onRendered(async function(){
  await $.getScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.2");
  await $.getScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.0");
  await $.getScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd");
  // await $.getScript( "./face-api.js" )
  // .done(function( script, textStatus ) {
  //   console.log( textStatus );
  // })
  // .fail(function( jqxhr, settings, exception ) {
  //   $( "div.log" ).text( "Triggered ajaxError handler." );
  // });
  await $.getScript( "/face-api.min.js" )
  .done(function( script, textStatus ) {
    console.log( textStatus );
  })
  .fail(function( jqxhr, settings, exception ) {
    $( "div.log" ).text( "Triggered ajaxError handler." );
  });
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  await faceapi.nets.faceExpressionNet.loadFromUri('/models')
  await faceapi.nets.ageGenderNet.loadFromUri('/models')
});

let flag = false;
async function startcanvas(){
  // console.log(tf.getBackend());
  // console.log("canvas");
   videoElement = document.getElementById('video');
   canvas = document.getElementById('canvas');
  options = {
    multiplier: 0.50,
    stride: 16,
    quantBytes: 2
  }
  bodyPix.load(options)
    .then((net)=>{
      perform(net)
    })
    .catch(err => console.log(err));
  async function perform(net){
    // console.log(net);
    var segmentation
    var backgroundColor
    draw();

    async function draw(){
      // segmentPerson
      // console.log(tf.memory());
         // console.log(await tf.io.listModels());
         // console.log("in frame 16");
      videoElement = document.getElementById("video");
      segmentation = await net.segmentPerson(videoElement);
      // net.dispose();
      if(flag == true){

      }

       foregroundColor = {r:0,g:0,b:0,a:0}
       backgroundColor = {r:0,g:0,b:0,a:255}
      let backgroundDarkeningMask = bodyPix.toMask(segmentation,foregroundColor,backgroundColor);

      if(blur){
        const backgroundBlurAmount = 6;
        const edgeBlurAmount = 2;
        const flipHorizontal = true;
        await bodyPix.drawBokehEffect(
        canvas, videoElement, segmentation, backgroundBlurAmount,
        edgeBlurAmount, flipHorizontal);
        // canvas.clearRect(0,0,canvas.width,canvas.height);
      }
      // console.log("in start canvas");
      if(isbackground){
        // console.log("in back");
        const canvas = document.getElementById('canvas');
        let ctx = canvas.getContext('2d');
        var input = document.getElementById("change-back");
        let background = new Image();
        background.src = URL.createObjectURL(input.files[0]);
        background.onload = async function(){
          ctx.putImageData(backgroundDarkeningMask,0,0);
          ctx.globalCompositeOperation = 'source-in'
          ctx.drawImage(background,0,0,canvas.width,canvas.height)
          ctx.globalCompositeOperation='destination-over'
          ctx.drawImage(videoElement,0,0,canvas.width,canvas.height)
          ctx.globalCompositeOperation = 'source-over'
        }

    }
      tf.dispose(segmentation);
      tf.dispose(backgroundDarkeningMask);
      requestAnimationFrame(draw);
    }

  }

}

let current = 1000;
function check_person() {


         setInterval(function() {

          // console.log(tf.memory().numTensors);
          // console.log(tf.memory());

           cocoSsd.load().then(model => {



          model.detect(videoElement).then(predictions => {

                  try {
                    if(predictions[0].class=="person"){
                      current = current + 1000;
                      console.log("person");
                    }
                    else {
                      console.log((current/1000)/60);
                    }
                    model.dispose()
                    tf.dispose(predictions);
                  } catch (err) {
                    // console.log(err);
                    console.log((current/1000)/60);
                    model.dispose()
                    tf.dispose(predictions);
                  }
              });

          });

      }, 1000);
    }


Template.Check.events({
   'click .auth':async function(){

     var options = {
         width: 640,
         height: 640,
         quality: 100
     };

     MeteorCamera.getPicture(options,(error, img) => {
         Meteor.call('detectFaces', img, (error,res) => {
              console.log(res);
         });
     });

   },
   'click .start':async function(){
     //start audio
     var SpeechRecognition =  webkitSpeechRecognition || SpeechRecognition ;
     recognition = new SpeechRecognition();

     content = ''
     recognition.continuous = true;
     // recognition.interimResults = true;
     recognition.start();
     var text = $("#textbox");
     recognition.onresult = function(event){
       // console.log("in result");
      var current = event.resultIndex;
      var transcript = event.results[current][0].transcript;
      content += transcript
      text.val(content);
     }
     recognition.onend = function(){
       recognition.start();
     }
     recognition.onerror = function(){
       // console.log("error");
     }

     //starting video
     isbackground = false;
     blur = false;
      videoElement = document.getElementById('video');
      canvas = document.getElementById('canvas');
     await navigator.mediaDevices.getUserMedia({video: true, audio: false})
       .then(async (stream) => {
         const videoElement = document.getElementById('video');
         videoElement.srcObject = stream;
         await videoElement.play();
         check_person();
         // tf.tidy(check_person);
       }).catch(err=>{
         console.log(err);
       });

   },
   'click .blur':function(){

     blur = true;
     isbackground = false;
     flag = true;
     startcanvas()
     // tf.tidy(startcanvas);

   },
   'click .background1':function(){

     // console.log("click");
     isbackground = true;
     blur = false;
     var input = document.getElementById("change-back");
     // console.log(input.files[0]);
     flag = true;
     startcanvas();
     // tf.tidy(startcanvas);
   },
   'click .pridict': async function(){
     // const canvas = faceapi.createCanvasFromMedia(videoElement)
     const canvas = document.getElementById("cv1");
     const displaySize = { width: videoElement.width, height: videoElement.height }

      setInterval(async()=>{
        const detections = await faceapi.detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions().withAgeAndGender()
        try {
          console.log(detections[0].gender);
        } catch (e) {

        }
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        faceapi.draw.drawDetections(canvas, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
        // console.log(tf.memory());
      },100)
    }

})
