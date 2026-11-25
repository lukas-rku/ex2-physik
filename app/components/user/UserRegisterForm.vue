<script lang="ts" setup>
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import { z } from "zod"

const { client } = useAuth()
const registrationError = ref("")
const loading = ref(false)
const ready = ref(false)
onMounted(() => {
  ready.value = true
})
const knownMails: string[] = []

const schema = userRegisterSchemaWithRepeatValidatePassword.and(
  z.object({
    email: emailSchema.email.refine(
      value => !knownMails.includes(value),
      { message: "Es existiert bereits ein Account mit dieser E-Mail." },
    ),
  }),
)

const formSchema = toTypedSchema(schema)
const form = useForm({ validationSchema: formSchema })

const onSubmit = form.handleSubmit(async (values) => {
  if (loading.value) return
  loading.value = true
  const data = {
    email: values.email,
    name: values.name,
    password: values.password,
  }

  registrationError.value = ""
  try {
    const registration = await client.signUp.email(data)
    let error = registration.error
    // An optional verification email can fail after Better Auth has created the account.
    if (error && error.status >= 500) {
      const login = await client.signIn.email({ email: values.email, password: values.password })
      if (login.data?.token) error = null
    }
    if (error) {
      if (error.code === "USER_ALREADY_EXISTS") {
        knownMails.push(values.email)
        await form.validate()
      } else {
        registrationError.value = error.message || "Registrierung fehlgeschlagen."
      }
      return
    }
    await navigateTo("/2fa/setup", { external: true, replace: true })
  } catch {
    registrationError.value = "Registrierung fehlgeschlagen. Bitte prüfe deine Verbindung."
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <form
    method="post"
    class="grid gap-4"
    @submit="onSubmit"
  >
    <FormField
      v-slot="{ componentField }"
      name="email"
    >
      <FormItem>
        <FormLabel>E-Mail</FormLabel>
        <FormControl>
          <Input
            id="email"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField
      v-slot="{ componentField }"
      name="name"
    >
      <FormItem>
        <FormLabel>Nutzername</FormLabel>
        <FormControl>
          <Input
            id="name"
            v-bind="componentField"
            type="text"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField
      v-slot="{ componentField }"
      name="password"
      :validate-on-input="true"
    >
      <FormItem>
        <FormLabel>Passwort</FormLabel>
        <FormControl>
          <Input
            id="password"
            v-bind="componentField"
            type="password"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField
      v-slot="{ componentField }"
      name="confirmPassword"
    >
      <FormItem>
        <FormLabel>Passwort wiederholen</FormLabel>
        <FormControl>
          <Input
            id="confirmPassword"
            v-bind="componentField"
            type="password"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField
      v-slot="{ value, handleChange }"
      type="checkbox"
      name="acceptedTermsOfService"
    >
      <FormItem class="flex flex-row items-start gap-x-3 space-y-0">
        <FormControl>
          <Checkbox
            :checked="value"
            @update:checked="handleChange"
          />
        </FormControl>
        <div class="space-y-1 leading-none">
          <FormLabel>
            Ich akzeptiere die
            <NuxtLink
              to="/legal/terms-of-service"
              class="underline"
            >Nutzungsbedingungen</NuxtLink>.
          </FormLabel>
        </div>
      </FormItem>
    </FormField>
    <p
      v-if="registrationError"
      role="alert"
      class="text-destructive"
    >
      {{ registrationError }}
    </p>
    <Button
      :loading="loading"
      :disabled="!ready || loading"
      type="submit"
    >
      Registrieren
    </Button>
  </form>
</template>

<style>

</style>
