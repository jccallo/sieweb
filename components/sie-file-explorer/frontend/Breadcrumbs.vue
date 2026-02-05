<template lang="pug">
div.breadcrumbs-container(ref="container")
  q-breadcrumbs.text-grey-8(gutter="sm" style="flex-wrap: nowrap; width: max-content")
    //- Root Label (Raiz)
    q-breadcrumbs-el(
      v-if="rootLabel"
      icon="home" 
      :label="rootLabel"
      class="text-grey-7 no-pointer-events"
    )
    
    //- Home Label (Archivos)
    q-breadcrumbs-el(
      :label="homeLabel" 
      :class="ruta.length === 0 ? 'text-primary text-weight-bold' : 'cursor-pointer'"
      @click="$emit('navigate', -1)"
    )

    //- Rutas dinámicas
    q-breadcrumbs-el(
      v-for="(item, i) in visibleItems"
      :key="i"
      :label="item.label" 
      :class="itemClass(item)" 
      @click="itemClick(item)"
    )
</template>

<script>
import { QBreadcrumbs, QBreadcrumbsEl } from "quasar"

export default {
  name: "SieFileBreadcrumbs",
  components: { QBreadcrumbs, QBreadcrumbsEl },
  props: {
    ruta: {
      type: Array,
      default: () => [],
    },
    homeLabel: {
      type: String,
      default: "Archivos",
    },
    rootLabel: {
      type: String,
      default: "",
    },
  },
  data () {
    return {
      containerWidth: 0,
      visibleItems: []
    }
  },
  mounted () {
    this.observer = new ResizeObserver(entries => {
      // Usamos requestAnimationFrame para evitar errores de loop en observer
      window.requestAnimationFrame(() => {
        if (!entries || !entries[0]) return
        this.containerWidth = entries[0].contentRect.width
        this.calcularVisibilidad()
      })
    })
    this.observer.observe(this.$refs.container)
    // Cálculo inicial
    this.calcularVisibilidad()
  },
  beforeUnmount () {
    if (this.observer) this.observer.disconnect()
  },
  watch: {
    ruta: {
      handler () { this.calcularVisibilidad() },
      deep: true
    }
  },
  methods: {
    itemClass (item) {
      if (item.isEllipsis) return 'text-grey-6 no-pointer-events'
      if (item.isLast) return 'text-primary text-weight-bold'
      return 'cursor-pointer'
    },
    itemClick (item) {
      if (item.isEllipsis || item.isLast) return
      this.$emit('navigate', item.originalIndex)
    },
    async calcularVisibilidad () {
      const allItems = this.getItemsRuta()
      
      // Intentar mostrar todo primero
      this.visibleItems = [...allItems]
      
      // Esperar renderizado para medir
      await this.$nextTick()
      
      if (!this.checkOverflow()) return

      await this.aplicarTruncado(allItems)
    },

    /** Convierte la ruta de strings a objetos con metadatos */
    getItemsRuta () {
      return this.ruta.map((label, index) => ({
        label,
        originalIndex: index,
        isLast: index === this.ruta.length - 1,
        isEllipsis: false
      }))
    },

    /** Verifica si el contenido desborda el contenedor */
    checkOverflow () {
      const container = this.$refs.container
      return container && container.scrollWidth > container.clientWidth
    },

    /** Aplica la lógica iterativa de truncado */
    async aplicarTruncado (allItems) {
      if (allItems.length <= 1) return

      // Estrategia: "Archivos > ... > Carpeta N > ..."
      // Vamos probando ocultando desde el segundo elemento (index 1)
      for (let i = 1; i < allItems.length; i++) {
        const remaining = allItems.slice(i)
        const ellipsis = { label: '...', isEllipsis: true }
        
        this.visibleItems = [ellipsis, ...remaining]

        await this.$nextTick()
        
        if (!this.checkOverflow()) return // Ya cabe
      }
      
      // Fallback extremo: solo mostrar '...' y el último
      const ellipsis = { label: '...', isEllipsis: true }
      const lastItem = allItems[allItems.length - 1]
      this.visibleItems = [ellipsis, lastItem]
    }
  }
}
</script>

<style scoped>
.breadcrumbs-container {
  max-width: 100%;
  overflow: hidden;
}
</style>
