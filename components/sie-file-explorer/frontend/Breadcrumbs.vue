<template lang="pug">
q-breadcrumbs.text-grey-8(gutter="sm")
  q-breadcrumbs-el(
    icon="home" 
    label="Imágenes" 
    :class="ruta.length === 0 ? 'text-primary text-weight-bold' : 'cursor-pointer'"
    @click="$emit('navigate', -1)"
  )
  q-breadcrumbs-el(
    v-for="(crumb, index) in ruta"
    :key="index"
    :label="crumb" 
    :class="index === ruta.length - 1 ? 'text-primary text-weight-bold' : 'cursor-pointer'" 
    @click="$emit('navigate', index)"
  )
</template>

<script>
import { QBreadcrumbs, QBreadcrumbsEl } from "quasar"

export default {
  name: 'SieFileBreadcrumbs',
  components: { QBreadcrumbs, QBreadcrumbsEl },
  props: {
    ruta: {
      type: Array,
      default: () => []
    }
  }
}
</script>
