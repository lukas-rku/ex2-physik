<script lang="ts" setup>
const { header, message, onDelete, actionLabel } = defineProps({
  header: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  actionLabel: { type: String, default: "Löschen" },
  onDelete: {
    type: Function,
    required: true,
  },
})
</script>

<template>
  <AlertDialog>
    <AlertDialogTrigger as-child>
      <slot />
    </AlertDialogTrigger>
    <AlertDialogContent class="max-h-full overflow-auto">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ header }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ message }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>
          Abbrechen
        </AlertDialogCancel>
        <AlertDialogAction
          class="hover:bg-destructive hover:text-destructive-foreground"
          @click="onDelete()"
        >
          {{ actionLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<style>

</style>
