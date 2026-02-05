<template lang="pug">
q-table(
  :rows="data"
  :columns="columnasFiltradas"
  row-key="name"
  flat
  :pagination="pagination"
  dense
)
  template(v-slot:body-cell-icon="props")
    q-td(:props="props" auto-width @contextmenu.prevent)
      q-icon.cursor-pointer(
        @click="abrirItem(props.row)" 
        :name="getIcon(props.row).name" 
        :color="getIcon(props.row).color" 
        size="sm"
      )
      q-menu(context-menu)
        q-list(dense style="min-width: 150px")
          q-item(clickable v-close-popup @click="abrirItem(props.row)")
            q-item-section Abrir
          template(v-if="props.row.type !== 'folder'")
            q-separator
            q-item(clickable v-close-popup @click="descargarArchivo(props.row)")
              q-item-section Descargar
          template(v-if="canDelete")
            q-separator
            q-item(clickable v-close-popup @click="eliminarItem(props.row)")
              q-item-section.text-negative Eliminar

  template(v-slot:body-cell-name="props")
    q-td(:props="props" @contextmenu.prevent)
      span.cursor-pointer(
        @click="abrirItem(props.row)" 
        :class="props.row.type === 'folder' ? 'text-primary text-weight-bold' : ''"
      ) {{ props.row.name }}
      q-menu(context-menu)
        q-list(dense style="min-width: 150px")
          q-item(clickable v-close-popup @click="abrirItem(props.row)")
            q-item-section Abrir
          template(v-if="props.row.type !== 'folder'")
            q-separator
            q-item(clickable v-close-popup @click="descargarArchivo(props.row)")
              q-item-section Descargar
          template(v-if="canDelete")
            q-separator
            q-item(clickable v-close-popup @click="eliminarItem(props.row)")
              q-item-section.text-negative Eliminar

  template(v-slot:body-cell-fecha="props")
    q-td(:props="props")
      span {{ formatDateCustom(props.row.fecha) }}

  template(v-slot:body-cell-actions="props")
    q-td(:props="props" auto-width)
      q-btn(flat dense color="negative" icon="delete" size="sm" @click="eliminarItem(props.row)")
</template>

<script>
import { QTable, QBtn, QTd, QIcon, QMenu, QList, QItem, QItemSection, QSeparator, date } from 'quasar'

export default {
  name: 'SieFileList',
  components: { QTable, QIcon, QBtn, QTd, QMenu, QList, QItem, QItemSection, QSeparator },
  props: {
    data: {
      type: Array,
      default: () => []
    },
    columns: {
      type: Array,
      default: () => []
    },
    rowsPerPage: {
      type: Number,
      default: 15
    },
    canDelete: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    pagination () {
      return {
        rowsPerPage: this.rowsPerPage
      }
    },
    columnasFiltradas () {
      if (this.canDelete) return this.columns
      return this.columns.filter(c => c.name !== 'actions')
    }
  },
  methods: {
    /** Abre el menú contextual en la posición del cursor */
    abrirMenuContextual (event, row) {
      // El menú se abre automáticamente con context-menu
      // Este método está aquí por si necesitamos lógica adicional
    },
    /** Abre el archivo o carpeta seleccionado */
    abrirItem (row) {
      this.$emit('open', row)
    },
    /** Descarga el archivo seleccionado */
    descargarArchivo (row) {
      this.$emit('download', row)
    },
    /** Elimina el archivo o carpeta seleccionado */
    eliminarItem (row) {
      this.$emit('delete', row)
    },
    getIcon (row) {
      if (row.type === 'folder') {
        return { name: 'folder', color: 'amber' }
      }
      if (row.type === 'audio') {
        return { name: 'audiotrack', color: 'orange' }
      }
      if (row.type === 'video') {
        return { name: 'videocam', color: 'deep-orange' }
      }
      if (row.type === 'archive') {
        return { name: 'archive', color: 'brown' }
      }
      
      const name = row.name.toLowerCase()
      if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif')) {
        return { name: 'photo', color: 'purple' }
      }
      if (name.endsWith('.pdf')) {
        return { name: 'picture_as_pdf', color: 'red' }
      }
      if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
        return { name: 'insert_drive_file', color: 'green' }
      }
      if (name.endsWith('.doc') || name.endsWith('.docx')) {
        return { name: 'article', color: 'blue' }
      }

      return { name: 'description', color: 'grey' }
    },
    formatDateCustom (val) {
      if (!val) return ''
      return date.formatDate(val, 'DD/MM/YYYY hh:mm aa')
    }
  }
}
</script>
