<template>
  <div class="fixed-in-bottom-corner">
    <div class="contact-us pointer" @click="onClick">
      <div class="badge d-flex align-items-center justify-content-center">
        <div class="d-flex align-items-center justify-content-center">
          <span class="mr-3 d-none d-sm-block">
            <i class="fas fa-bolt" style="color: gold" />
            Powered By Authress</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const onClick = () => {
  window.open('https://authress.io', '_blank');
};
</script>
  
<style lang="scss" scoped>
.fixed-in-bottom-corner {
  z-index: 100;
  position: fixed;
  bottom: 0.5em;
  right: 1.25em;

  // @include media-breakpoint-down(xs) {
  //   right: .75em;
  //   bottom: .75em;
  // }
}

.contact-us {
  > * {
    color: white;
  }
}
.badge {
  font-size: inherit;
  background-color: #337ab7;
  width: 20rem;
  height: 3rem;
  border-radius: 100px;
  margin: 0 1rem;
  cursor: pointer;

}

.d-flex {
  display: flex;
  width: 100%;

  .align-items-center {
    align-items: center;
  }
  .justify-content-center {
    justify-content: space-around;
  }
}

// @include media-breakpoint-down(xs) {
//   .badge {
//     width: 3.125rem;
//     height: 3rem;
//   }
// }
</style>
