<style lang="postcss">
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

.root__overlayText {
  position: absolute;
  display: inline-block;
  width: 100%;
  text-align: center;
  white-space: nowrap;
  margin: 0;
  color: white;
  font-weight: bold;
}

.root__overlayText[type="normal"] {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.root__overlayText[type="godzilla"] {
  bottom: 0;
  left: 0;
  transform: scaleX(0.85);
  letter-spacing: -0.03em;
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
    p.root__overlayText(
      ref="overlayText", :style="styles.root__overlayText",
      :type="overlayTextType",
    )
      span {{text}}
  .root__videoContainer.root__videoPreview(
    v-show="status === STATUS.GENERATING",
  )
    video(ref="recorded", loop, muted, autoplay)
    p.root__overlayText(
      ref="overlayText", :style="styles.root__overlayText",
      :type="overlayTextType",
    )
      span {{text}}
    progress.progress.is-info(:value="progress * 10", max="11")
  .root__videoContainer(
    v-show="status === STATUS.GENERATED",
  )
    img(:src="gifImage", ref="gifImage")
  .root__download.columns.is-gapless.is-flex.is-marginless
    .column.is-3-mobile.is-flex.has-text-left
      button.button.is-outlined.is-danger(@click="reset") RESET
    .column.is-1-mobile.is-flex
      button.button
        i.fa(
        :class="{\
          'fa-thumbs-o-up': overlayTextType === 'normal',\
          'fa-warning': overlayTextType === 'godzilla',\
        }", @click="toggleType")
    .column.is-4-mobile.is-flex
      input.input(
        v-model="text", placeholder="LGTM", :disabled="status !== STATUS.STOP",
        @keyup.enter="blur",
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
  japont-config(
    ref="japont", src="ipaex/ipaex-mincho.woff",
    selector=".root__overlayText[type='godzilla']", alias="IPAexMincho"
  )
</template>

<script>
import RecordRTC from 'recordrtc';
import gifshot from 'gifshot';
import saveAs from 'file-saver';
import debounce from 'lodash.debounce';
import eaw from 'eastasianwidth';
import CaptureButton from './CaptureButton.vue';

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
    overlayTextType: 'normal',
    constraints: {
      audio: false,
      video: true,
    },
    recordRTCOptions: {
      mimeType: 'video/mp4',
      type: 'video',
      numWorkers: 2,
    },
    styles: {
      root__overlayText: {
        fontSize: '',
      },
    },
    STATUS,
  }),
  computed: {},
  watch: {
    stream(stream) {
      this.$refs.video.srcObject = stream;
      this.recordRTC = new RecordRTC(stream, this.recordRTCOptions);
    },
    text() {
      this.fitOverlayText();
      this.reloadFont();
    },
    overlayTextType() {
      this.reloadFont();
    },
  },
  mounted() {
    this.initStream();
    this.initCanvasPatch();
    this.fitOverlayText();
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
    initCanvasPatch() {
      const originalFillText = CanvasRenderingContext2D.prototype.fillText;
      const self = this;
      CanvasRenderingContext2D.prototype.fillText = function fillText(text, x, y) {
        if (self.overlayTextType === 'godzilla') {
          this.canvas.style['letter-spacing'] = '-0.03em';
          const textWidth =
            self.$refs.overlayText.querySelector('span').getBoundingClientRect().width;
          const calcedWidth =
            (textWidth * 300) / window.innerWidth;
          originalFillText.call(this, text, x, y, calcedWidth);
        } else {
          originalFillText.call(this, text, x, y);
        }
      };
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
        this.recStartDate = new Date();
        this.updateRecTime();
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

      const overlayTextStyle = window.getComputedStyle(this.$refs.overlayText);
      const fontSize =
        `${(parseFloat(overlayTextStyle.fontSize) * 300) / window.innerWidth}px`;

      gifshot.createGIF({
        video: [this.recorded],
        interval,
        numFrames: Math.floor(duration / interval),
        gifWidth: 300,
        gifHeight: 300,
        text: this.text,
        fontFamily: overlayTextStyle.fontFamily,
        fontWeight: overlayTextStyle.fontWeight,
        fontSize,
        textAlign: 'center',
        textBaseline: (this.overlayTextType === 'normal') ? 'middle' : 'bottom',
        textYCoordinate: (this.overlayTextType === 'normal') ? 150 : null,
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
    toggleType() {
      const type = this.overlayTextType;
      if (type === 'normal') {
        this.overlayTextType = 'godzilla';
      } else {
        this.overlayTextType = 'normal';
      }
    },
    downloadGif() {
      fetch(this.gifImage)
        .then(res => res.blob())
        .then(blob => saveAs(blob, `${this.text}.gif`));
    },
    fitOverlayText() {
      const len =
        (this.type === 'normal')
        ? eaw.length(this.text) / 2
        : this.text.length;
      this.styles.root__overlayText.fontSize = `calc(90vw / ${len})`;
    },
    reloadFont: debounce(function reloadFont() {
      if (this.overlayTextType === 'godzilla') {
        this.$refs.japont.reload();
      }
    }, 1000),
    blur($event) {
      $event.target.blur();
    },
  },
  components: {
    CaptureButton,
  },
};
</script>
