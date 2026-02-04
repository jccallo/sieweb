<template lang="pug">
div.row.items-center
  div.col
    q-btn.q-mr-sm.q-px-sm.q-py-xs(
      v-if="canUpload"
      color="primary" 
      icon="cloud_upload" 
      label="Subir archivo" 
      @click="$emit('upload')" 
      dense size="sm"
    )
    q-btn.q-mr-sm.q-px-sm.q-py-xs(
      v-if="canCreateFolder"
      color="primary" 
      icon="create_new_folder" 
      label="Crear carpeta" 
      @click="$emit('create-folder')" 
      dense size="sm"
    )
  
  span
    q-btn(flat round dense icon="arrow_upward" color="grey-7" @click="$emit('back')" :disable="!canGoBack")
    q-tooltip(anchor="top middle" self="bottom middle" :offset="[10, 10]" style="font-size: 11px") Arriba
  
  q-btn(flat round dense icon="refresh" color="grey-7" @click="$emit('refresh')")
    q-tooltip(anchor="top middle" self="bottom middle" :offset="[10, 10]" style="font-size: 11px") Actualizar
</template>

<script>
import { QBtn, QTooltip } from "quasar"

export default {
  name: 'SieFileToolbar',
  components: { QBtn, QTooltip },
  props: {
    canGoBack: {
      type: Boolean,
      default: false
    },
    canUpload: {
      type: Boolean,
      default: true
    },
    canCreateFolder: {
      type: Boolean,
      default: true
    }
  }
}
</script>
