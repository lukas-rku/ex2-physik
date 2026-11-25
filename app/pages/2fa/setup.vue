<script setup lang="ts">
definePageMeta({ title: "Zwei-Faktor-Authentifizierung einrichten", layout: "auth" })

const qr = ref("")
const code = ref("")
const codes = ref<string[]>([])
const saved = ref(false)
const busy = ref(false)
const error = ref("")
const copyStatus = ref("")

async function loadSetup() {
  busy.value = true
  error.value = ""
  try {
    const status = await $fetch("/api/2fa/status")
    if (status.enabled) {
      await navigateTo(status.required ? "/2fa/challenge" : "/profile")
      return
    }
    qr.value = (await $fetch("/api/2fa/setup", { retry: 0 })).qrDataUrl
  } catch {
    error.value = "Die Einrichtung konnte nicht geladen werden."
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void loadSetup()
})

async function confirmCode() {
  if (busy.value || !/^\d{6}$/.test(code.value)) return
  busy.value = true
  error.value = ""
  try {
    const result = await $fetch("/api/2fa/enable", { method: "POST", body: { code: code.value } })
    codes.value = result.recoveryCodes
    qr.value = ""
    code.value = ""
  } catch {
    error.value = "Bestätigung fehlgeschlagen. Prüfe den aktuellen Code deiner App und versuche es erneut."
  } finally {
    busy.value = false
  }
}

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(codes.value.join("\n"))
    copyStatus.value = "Codes kopiert."
  } catch {
    copyStatus.value = "Kopieren fehlgeschlagen. Du kannst die Codes als Datei herunterladen."
  }
}

onBeforeRouteLeave(() => !codes.value.length || saved.value)
</script>

<template>
  <Card class="mx-4 w-full max-w-md">
    <CardHeader>
      <CardTitle>{{ codes.length ? "Wiederherstellungscodes speichern" : "Zwei-Faktor-Authentifizierung einrichten" }}</CardTitle>
    </CardHeader>
    <CardContent class="grid gap-4">
      <template v-if="codes.length">
        <p>Bewahre diese Codes sicher auf. Damit kannst du dich anmelden, wenn du den Zugriff auf deine Authenticator-App verlierst.</p>
        <ul class="grid grid-cols-2 gap-2 font-mono">
          <li
            v-for="item in codes"
            :key="item"
          >
            {{ item }}
          </li>
        </ul>
        <Button
          variant="outline"
          @click="copyCodes"
        >
          Alle kopieren
        </Button>
        <a
          class="underline"
          :href="'data:text/plain;charset=utf-8,' + encodeURIComponent(codes.join('\n'))"
          download="wiederherstellungscodes.txt"
        >Als .txt herunterladen</a>
        <p
          v-if="copyStatus"
          role="status"
        >
          {{ copyStatus }}
        </p>
        <label><input
          v-model="saved"
          type="checkbox"
        > Ich habe meine Wiederherstellungscodes gespeichert.</label>
        <Button
          :disabled="!saved"
          @click="navigateTo('/profile')"
        >
          Weiter zum Profil
        </Button>
      </template>
      <form
        v-else-if="qr"
        class="grid gap-4"
        @submit.prevent="confirmCode"
      >
        <p>Scanne den QR-Code mit deiner Authenticator-App.</p>
        <img
          :src="qr"
          alt="QR-Code für deine Authenticator-App"
          class="mx-auto"
        >
        <label for="setup-code">Sechsstelliger Code aus der App</label>
        <Input
          id="setup-code"
          v-model="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          pattern="[0-9]{6}"
          required
        />
        <Button
          type="submit"
          :disabled="busy || !/^\d{6}$/.test(code)"
        >
          Code bestätigen
        </Button>
      </form>
      <p
        v-else-if="busy"
        role="status"
      >
        QR-Code wird geladen …
      </p>
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p>
      <Button
        v-if="error && !qr"
        @click="loadSetup"
      >
        Erneut versuchen
      </Button>
    </CardContent>
  </Card>
</template>
