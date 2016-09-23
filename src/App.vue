<style lang="postcss">
@import "normalize.css";
@import "bulma/css/bulma.css";

html, body, .root {
  width: 100vw;
  height: 100vh;
  background: black;
  user-select: none;
}
.root__videoContainer {
  position: relative;
  width: 100vw;
  height: 100vw;
  margin: auto;
  overflow: hidden;

  & > video, & > img {
    display: inline-block;
    min-width: 100%;
    min-height: 100%;
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

.root__videoPreview > p {
  position: absolute;
  display: inline-block;
  width: 100%;
  text-align: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  color: white;
  font-size: calc(100vw / 4);
  font-weight: bold;
}

.root__videoPreview > progress {
  position: absolute;
  display: inline-block;
  width: 80%;
  height: 2vh;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  color: white;
  font-size: calc(100vw / 4);
  font-weight: bold;
}

.root__download {
  width: 100%;
  height: auto;
  box-sizing: border-box;
  padding: 0 10px;
}

.root__controller {
  width: 100vw;
  height: calc(100vh - 100vw - 32px);
  box-sizing: border-box;
  overflow: hidden;
  padding: 5vw;
}

.root__captureButton {
  max-width: 100%;
  max-height: 100%;
}

</style>

<template lang="pug">
.root
  .root__videoContainer.root__videoPreview(
    v-show="status === STATUS.STOP || status === STATUS.RECORDING",
  )
    video(ref="video", muted, autoplay)
    p.root__overlayText {{text}}
  .root__videoContainer.root__videoPreview(
    v-show="status === STATUS.GENERATING",
  )
    video(ref="recorded", loop, muted, autoplay)
    p.root__overlayText {{text}}
    progress.progress.is-info(:value="progress * 10", max="11")
  .root__videoContainer(
    v-show="status === STATUS.GENERATED",
  )
    img(:src="gifImage", ref="gifImage")
  .root__download.columns.is-gapless.is-flex.is-marginless
    .column.is-3-mobile.is-flex.has-text-left
      button.button.is-outlined.is-danger(@click="reset") RESET
    .column.is-1-mobile.is-flex
    .column.is-4-mobile.is-flex
      input.input(
        v-model="text", placeholder="LGTM", :disabled="status !== STATUS.STOP"
      )
    .column.is-1-mobile.is-flex
    .column.is-3-mobile.is-flex.has-text-right
      button.button.is-outlined.is-primary(
        @click="downloadGif", :disabled="status !== STATUS.GENERATED"
      ) DOWNLOAD
  .root__controller
    capture-button.root__captureButton(
      :time="recTime", @start="startRecord", @stop="stopRecord",
    )
  japont-config(ref="japont", src="ipaex/ipaex-mincho.woff" selector=".root__overlayText" alias="IPAexMincho")
</template>

<script>
import RecordRTC from 'recordrtc';
import gifshot from 'gifshot';
import { saveAs } from 'file-saver';
import CaptureButton from './CaptureButton.vue';
import debounce from 'lodash.debounce';

const STATUS = {
  INIT: 0,
  STOP: 1,
  RECORDING: 2,
  GENERATING: 3,
  GENERATED: 4,
};

export default {
  data: () => ({
    stream: null,
    recordRTC: null,
    recorded: null,
    gifImage: null,
    status: STATUS.INIT,
    progress: 0,
    recTime: 0,
    recStartDate: null,
    devices: [],
    text: 'LGTM',
    constraints: {
      audio: false,
      video: true,
    },
    options: {
      mimeType: 'video/mp4',
      type: 'video',
      videoBitsPerSecond: 128000,
      numWorkers: 4,
    },
    STATUS,
  }),
  computed: {},
  watch: {
    stream(stream) {
      this.$refs.video.srcObject = stream;
      this.recordRTC = new RecordRTC(stream, this.options);
    },
    status(status) {
      if (status === STATUS.RECORDING) {
        this.recStartDate = new Date();
        this.updateRecTime();
      }
    },
    text() {
      this.reloadFont();
    },
  },
  mounted() {
    this.initStream();
  },
  methods: {
    initStream() {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          this.devices =
            devices.filter(d => d.kind === 'videoinput');
          const device =
            this.devices.find(d => d.label.toLowerCase().includes('back'));
          if (device) {
            this.constraints.video = {
              deviceId: { exact: device.deviceId },
            };
          } else {
            this.constraints.video = true;
          }
          navigator.mediaDevices.getUserMedia(this.constraints)
            .then(this.initStreamSuccessHandler.bind(this))
            .catch(this.initStreamErrorHandler.bind(this));
        });
    },
    initStreamSuccessHandler(stream) {
      this.stream = stream;
      this.status = STATUS.STOP;
      const videoTracks = stream.getVideoTracks();
      console.log(videoTracks);
    },
    initStreamErrorHandler(error) {
      if (error.name === 'ConstraintNotSatisfiedError') {
        console.error(`The resolution ${this.constraints.video.width.exact} x ${this.constraints.video.width.exact} px is not supported by your device.`);
      } else if (error.name === 'PermissionDeniedError') {
        console.error('Permissions have not been granted to use your camera and microphone, you need to allow the page access to your devices in order for the demo to work.');
      }
      console.error(`getUserMedia error: ${error.name}`, error);
    },
    startRecord() {
      if (this.status === STATUS.STOP) {
        this.status = STATUS.RECORDING;
        this.recordRTC.startRecording();
      }
    },
    stopRecord() {
      if (this.status === STATUS.RECORDING) {
        this.status = STATUS.GENERATING;
        this.progress = 0;
        this.recordRTC.stopRecording((videoURL) => {
          this.recorded = videoURL;
          this.playPreview();
          this.createGif();
        });
      }
    },
    playPreview() {
      const duration = Math.floor(this.recTime);
      const playbackRate = (duration <= 4) ? 1 : 2;

      this.$refs.recorded.src = this.recorded;
      this.$refs.recorded.playbackRate = playbackRate;
    },
    updateRecTime() {
      if (this.status === STATUS.RECORDING) {
        this.recTime = (new Date() - this.recStartDate) / 1000;
        if (this.recTime > 10) {
          this.stopRecord();
        }
        requestAnimationFrame(this.updateRecTime.bind(this));
      }
    },
    createGif() {
      console.log('Creating Gif...');

      const duration = this.recTime;
      const interval = (duration <= 4) ? 0.1 : 0.2;

      gifshot.createGIF({
        video: [this.recorded],
        interval,
        numFrames: Math.floor(duration / interval),
        gifWidth: 300,
        gifHeight: 300,
        text: this.text,
        fontFamily: 'IPAexMincho',
        fontWeight: 'bold',
        fontSize: `${(300 / 4)}px`,
        textAlign: 'center',
        textBaseline: 'middle',
        textYCoordinate: 150,
        progressCallback: (progress) => {
          this.progress = progress;
        },
      },
      (obj) => {
        if (!obj.error) {
          this.gifImage = obj.image;
          this.status = STATUS.GENERATED;
        } else {
          console.error(obj.error);
        }
      });
    },
    reset() {
      location.reload();
    },
    downloadGif() {
      fetch(this.gifImage)
        .then(res => res.blob())
        .then(blob => saveAs(blob, `${this.text}.gif`));
    },
    reloadFont: debounce(function reloadFont() {
      this.$refs.japont.reload();
    }, 1000),
  },
  components: {
    CaptureButton,
  },
};
</script>
