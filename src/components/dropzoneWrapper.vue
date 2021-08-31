<template>
  <form id="dropzone" style="min-height: 100%">
    <div class="dropzoneWrapper" ref="root">
      <div id="overlay" ref="overlay" :class="{ displayOverlay: state.overlayActive }">
        <div class="dropzoneOverlayText">
          <div class="text">
            <h2 class="title">Dropzone</h2>
            <h3>Drag and drop files and folders you want to upload here.</h3>
          </div>
        </div>
      </div>
      <slot />
    </div>

    <div id="hiddenDropZoneList" style="display: none" />
  </form>
</template>

<script setup>
import Dropzone from 'dropzone';
import "dropzone/dist/dropzone.css";
import 'dragster';
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['enter', 'leave', 'fileAdded']);

const root = ref(null);
const state = reactive({ enterFunction: null, leaveFunction: null, dragster: null, overlayActive: false });

onMounted(() => {
  state.dragster = new Dragster(root.value);
  state.enterFunction = (e) => {
    state.overlayActive = true;
    emit('enter', e);
  };
  state.leaveFunction = (e) => {
    state.overlayActive = false;
    emit('leave', e);
  };
  root.value.addEventListener('dragster:enter', state.enterFunction);
  root.value.addEventListener('dragster:leave', state.leaveFunction);

  // Make sure Dropzone doesn't try to attach itself to the element automatically. This behavior will change in future versions.
  Dropzone.autoDiscover = false;
  const configuredDropzone = new Dropzone('#dropzone', {
    autoQueue: false,
    url: "IGNORED",
    previewsContainer: '#hiddenDropZoneList'
  });
  configuredDropzone.on("addedfile", file => {
    console.log('File added', file.name, file.fullPath, file.size);
    emit('fileAdded', file);
    state.overlayActive = false;
    state.dragster.reset();
  });
});

onUnmounted(() => {
  // root.value.removeEventListener('dragster:enter', state.enterFunction);
  // root.value.removeEventListener('dragster:leave', state.leaveFunction);
  // state.dragster.removeListeners();
});

</script>

<style lang="scss" scoped>
.dropzoneWrapper {
  min-height: 100vh;
}
#overlay {
  position: fixed; /* Sit on top of the page content */
  display: none; /* Hidden by default */
  justify-content: space-around;
  width: 100%; /* Full width (cover the whole page) */
  height: 100%; /* Full height (cover the whole page) */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.7); /* Black background with opacity */
  z-index: 2; /* Specify a stack order in case you're using a different order for other elements */
  cursor: unset !important; /* Add a pointer on hover */

  &.displayOverlay {
    display: flex;
  }

  .dropzoneOverlayText {
    cursor: pointer;
    width: 95vw;
    height: 97vh;
    border: 3px dashed white;

    position: fixed;
    top: 1.5vh;
    left: 1.5vw;
    
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
  }

  .text {
    font-size: 50px;
    color: white;
    text-align: center;
    padding-bottom: 200px;
  }
}
</style>